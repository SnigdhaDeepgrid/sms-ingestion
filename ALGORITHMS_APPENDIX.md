# SMS Ingestion Dashboard
## Algorithms and Pseudocode Appendix

**Project:** SMS Ingestion Dashboard  
**Technology:** React, Node.js/Express, MongoDB/Mongoose  
**Purpose:** Document the algorithms, validation rules, search/filter operations, sorting, calculations, and processing workflows used by the project.

> **Implementation note:** The repository documentation describes the backend routes and `storeMessage()` behavior in `server/server.js`, while the checked-in `server/server.js` file is currently empty. The reparsing implementation in `server/reparse.js` and the client implementation in `client/src/App.js` are present. Backend algorithms below are therefore marked as **documented backend behavior** where they are not directly present in the checked-in server entry file.

---

## 1. Algorithm Inventory

| No. | Algorithm or process | Category | Main location |
|---:|---|---|---|
| 1 | SMS input validation and normalization | Validation / preprocessing | `parseMessage()` |
| 2 | Single-line CSV-like message splitting | Parsing | `parseMessage()` |
| 3 | Numeric value extraction | Parsing | `parseNum()` |
| 4 | Label and prefix recognition | Parsing | `parseMessage()` |
| 5 | Date and time combination | Parsing | `parseMessage()` |
| 6 | Company fallback detection | Parsing | `parseMessage()` |
| 7 | Duplicate message detection | Data integrity | `storeMessage()` |
| 8 | Raw-to-parsed message ingestion | ETL / persistence | `storeMessage()` |
| 9 | Product pricing lookup | Lookup | `storeMessage()`, `reparse.js` |
| 10 | Receipt value calculation | Arithmetic / derived data | `storeMessage()`, `reparse.js` |
| 11 | Bulk upload format detection | Input processing | `/upload` |
| 12 | Bulk upload processing | Batch processing | `/upload` |
| 13 | Reparse and synchronize records | Maintenance / migration | `server/reparse.js` |
| 14 | Parsed-message analytics aggregation | Aggregation | `/analytics` |
| 15 | Database result sorting | Ordering | Backend list routes |
| 16 | Register search/filter | Search | `Messages` component |
| 17 | Session authentication check | Authentication | `/auth/me`, `App` |
| 18 | Login and logout flow | Authentication | `Login`, `Dashboard` |
| 19 | Vendor input validation | Validation | `Vendors` component |
| 20 | Pricing input validation | Validation | `Pricing` component |
| 21 | Refresh-after-upload workflow | State synchronization | `Dashboard`, `Upload` |
| 22 | Loading and error-state handling | Fault tolerance / UI state | React components |

---

# 2. SMS Parsing Algorithms

## 2.1 Validate and Normalize SMS Input

### Purpose
Reject empty or non-string input and convert different line-ending formats into a consistent representation.

### Input
- `text: String`

### Output
- Normalized non-empty lines, or `null` if the input is invalid.

### Pseudocode

```text
FUNCTION parseMessage(text):
    IF text is missing OR text is not a string OR text.trim() is empty:
        RETURN null

    normalizedText = replace all CRLF with LF in text
    normalizedText = replace all remaining CR with LF

    lines = split normalizedText by LF
    lines = trim every line
    lines = remove empty lines

    IF lines is empty:
        RETURN null

    RETURN lines
```

### Complexity
- Time: $O(n)$, where $n$ is the SMS length.
- Space: $O(n)$ for the normalized lines.

### Project behavior
- Accepts Windows, Unix, and old-Mac line endings.
- Removes leading/trailing whitespace from each line.
- Ignores blank lines.

---

## 2.2 Split Single-Line CSV-Like Messages

### Purpose
Support an SMS supplied as one comma-separated line instead of multiple lines.

### Pseudocode

```text
IF number of lines = 1 AND the line contains a comma AND a colon:
    line = the only line
    lines = split line at commas, allowing surrounding whitespace
    trim every resulting item
    remove empty items
```

### Complexity
- Time: $O(n)$.
- Space: $O(n)$.

### Example

```text
Input:
XYZ Pvt Ltd, R:0000501, G:7200, N:7200, VE-AP25V6693

Processing form:
XYZ Pvt Ltd
R:0000501
G:7200
N:7200
VE-AP25V6693
```

---

## 2.3 Extract Numeric Values

### Purpose
Extract the first numeric value from weight fields, including numbers containing commas and decimals.

### Pseudocode

```text
FUNCTION parseNum(fragment):
    TRY:
        match = first occurrence of digits, optional commas, and optional decimal digits
        IF no match:
            RETURN null

        numericText = remove commas from match
        RETURN parse numericText as floating-point number
    CATCH:
        RETURN null
```

### Accepted examples

```text
"7200 kg"       -> 7200
"12,390 kg"     -> 12390
"42180.50 kg"   -> 42180.50
"unknown"       -> null
```

### Complexity
- Time: $O(k)$ per field, where $k$ is the field length.

---

## 2.4 Recognize Labels and Prefixes

### Purpose
Map free-form SMS lines to structured `ParsedMessage` fields using case-insensitive regular-expression rules.

### Pseudocode

```text
FOR each line in lines:
    TRY:
        IF line starts with G::
            result.gross = parseNum(text after G:)
            CONTINUE

        IF line starts with T::
            result.tare = parseNum(text after T:)
            CONTINUE

        IF line starts with N::
            result.net = parseNum(text after N:)
            CONTINUE

        IF line starts with GROSS WEIGHT:
            result.gross = parseNum(line)
            CONTINUE

        IF line starts with TARE WEIGHT:
            result.tare = parseNum(line)
            CONTINUE

        IF line starts with NET WEIGHT:
            result.net = parseNum(line)
            CONTINUE

        IF line starts with R: or RST::
            result.receipt = text after the label
            CONTINUE

        IF line starts with D::
            append text after D: to result.dates
            CONTINUE

        IF line starts with DATE: or DATE_1::
            extract date text
            optionally combine embedded TIME text
            append date to result.dates
            CONTINUE

        IF line starts with TIME: or TIME_1:::
            append time to the most recently stored date, if one exists
            CONTINUE

        IF line starts with VE-, VE, or VEHICLE NO::
            result.vehicle = text after the vehicle label
            CONTINUE

        IF line starts with PR-, PR, or PROD NAME::
            result.product = text after the product label
            CONTINUE

        IF line starts with PA- or PARTY NAME::
            result.party = text after the party label
            CONTINUE

        IF line starts with TP- or TPT NAME::
            result.location = text after the location label
            CONTINUE

        IF result.company is empty:
            result.company = line
    CATCH:
        ignore the malformed line and continue
```

### Recognized field families

| Field | Recognized forms |
|---|---|
| Gross weight | `G:`, `GROSS WEIGHT` |
| Tare weight | `T:`, `TARE WEIGHT` |
| Net weight | `N:`, `NET WEIGHT` |
| Receipt | `R:`, `RST:` |
| Date | `D:`, `DATE:`, `DATE_1:` |
| Time | `TIME:`, `TIME_1:` |
| Vehicle | `VE-`, `VE `, `VEHICLE NO:` |
| Product | `PR-`, `PR `, `PROD NAME:` |
| Party | `PA-`, `PARTY NAME:` |
| Location | `TP-`, `TPT NAME:` |

### Complexity
- Time: $O(n)$ lines, excluding the cost of regular-expression matching.
- Space: $O(n)$ for the result and date array.

---

## 2.5 Combine Date and Time Values

### Purpose
Store a complete timestamp-like string when date and time are provided separately.

### Pseudocode

```text
WHEN a DATE line is found:
    extract the date
    IF the same line contains TIME:
        remove TIME from the date line
        append "date time" to dates
    ELSE:
        append date to dates

WHEN a TIME line is found:
    IF at least one date already exists:
        replace the last date with "last date time"
```

### Example

```text
DATE: 04/02/2026
TIME: 14:35

Result:
"04/02/2026 14:35"
```

---

## 2.6 Company Fallback Detection

### Purpose
Capture the company name when it appears as an unlabeled line.

### Pseudocode

```text
IF a non-empty line does not match any known label:
    IF result.company is empty:
        result.company = current line
```

### Behavior
- Only the first unrecognized line becomes the company.
- Later unrecognized lines do not overwrite it.

---

# 3. Message Ingestion and Data Integrity

## 3.1 Duplicate Detection

### Purpose
Prevent the same normalized SMS text from being stored more than once.

### Pseudocode

```text
FUNCTION storeMessage(text, source):
    parsed = parseMessage(text)
    IF parsed is null:
        RAISE "Could not parse message"

    normalizedText = text.trim()
    existing = find one RawMessage where existing.text = normalizedText

    IF existing exists:
        RETURN duplicate result

    continue with insertion
```

### Matching rule
- Exact equality after trimming surrounding whitespace.
- Matching is not based on receipt number, vehicle, date, or fuzzy similarity.

### Complexity
- Application-side control flow: $O(1)$ excluding database lookup.
- Database performance depends on the index/query plan for `text`.

---

## 3.2 Raw-to-Parsed Message Ingestion

### Purpose
Store the original SMS and its structured interpretation as two related documents.

### Pseudocode

```text
FUNCTION storeMessage(text, source):
    parsed = parseMessage(text)
    IF parsed is null:
        RAISE parse error

    normalizedText = trim(text)
    IF RawMessage with normalizedText already exists:
        RETURN duplicate status

    raw = create RawMessage(
        text = normalizedText,
        source = source or "manual"
    )

    pricing = find Pricing where product = parsed.product
    IF pricing exists:
        pricePerKg = pricing.pricePerKg
    ELSE:
        pricePerKg = 0

    value = (parsed.net if parsed.net exists else 0) * pricePerKg

    processed = create ParsedMessage(
        rawMessageId = raw._id,
        all parsed fields,
        pricePerKg = pricePerKg,
        value = value
    )

    RETURN raw and processed
```

### Data relationship

```text
RawMessage 1 ---- 0..1 ParsedMessage
```

A raw message can exist without a parsed message if parsing fails. A successful ingestion creates both records.

---

## 3.3 Product Pricing Lookup

### Purpose
Find the configured price for the product extracted from an SMS.

### Pseudocode

```text
IF parsed.product exists:
    pricing = find one Pricing where Pricing.product = parsed.product
ELSE:
    pricing = null

IF pricing exists:
    pricePerKg = pricing.pricePerKg
ELSE:
    pricePerKg = 0
```

### Constraints
- `Pricing.product` is required and unique.
- The parsed document stores the looked-up numeric value in `pricePerKg`.
- The current data model does not store a `pricingId` foreign key.

### Complexity
- Application-side: $O(1)$ excluding database lookup.
- Database performance depends on the unique `product` index.

---

## 3.4 Receipt Value Calculation

### Purpose
Calculate the monetary value of the receipt’s net weight.

### Formula

$$
value = (net \text{ if available else } 0) \times pricePerKg
$$

### Pseudocode

```text
netValue = parsed.net if parsed.net is not null else 0
value = netValue * pricePerKg
```

### Example

```text
net = 7,200 kg
pricePerKg = 25
value = 7,200 * 25 = 180,000
```

---

# 4. Bulk Upload Algorithms

## 4.1 Detect Upload Format

### Purpose
Accept either a JSON array or plain text containing multiple messages.

### Pseudocode

```text
read uploaded file into fileText

TRY:
    parsedFile = parse fileText as JSON
    IF parsedFile is an array:
        records = parsedFile
    ELSE:
        use plain-text parsing
CATCH JSON parse error:
    use plain-text parsing

IF plain-text parsing is selected:
    records = split fileText into blocks separated by blank lines
```

### Supported JSON items

```text
"message text"
{ "text": "message text" }
```

### Plain-text rule
- Blank-line-separated blocks are treated as individual messages.

---

## 4.2 Process Bulk Upload

### Purpose
Process many uploaded messages while reporting successful inserts, duplicates, and skipped records.

### Pseudocode

```text
processedCount = 0
duplicateCount = 0
skippedCount = 0
results = []

FOR each item in records:
    IF item is a string:
        messageText = item
    ELSE IF item has a text property:
        messageText = item.text
    ELSE:
        skippedCount = skippedCount + 1
        CONTINUE

    IF messageText is missing OR length(messageText) < 5:
        skippedCount = skippedCount + 1
        CONTINUE

    result = storeMessage(messageText, "upload")

    IF result is duplicate:
        duplicateCount = duplicateCount + 1
    ELSE:
        processedCount = processedCount + 1
        append result to results

RETURN {
    processed: processedCount,
    duplicates: duplicateCount,
    skipped: skippedCount,
    results: results
}
```

### Complexity
- Time: $O(m \times p)$ plus database operations, where $m$ is the number of upload items and $p$ is the average message length.
- Space: $O(m)$ for result and status collections.

---

# 5. Reparse and Record Synchronization

## 5.1 Reparse Existing Raw Messages

### Purpose
Apply the current parser and current pricing rules to all previously stored raw messages.

### Pseudocode

```text
connect to MongoDB
rawMessages = find all RawMessage documents

FOR each raw in rawMessages:
    parsedData = parseMessage(raw.text)
    IF parsedData is null:
        CONTINUE

    pricing = find Pricing where product = parsedData.product
    pricePerKg = pricing.pricePerKg if pricing exists else 0
    value = (parsedData.net if present else 0) * pricePerKg

    existing = find ParsedMessage where rawMessageId = raw._id

    IF existing exists:
        update existing ParsedMessage with:
            parsedData
            pricePerKg
            value
    ELSE:
        create ParsedMessage with:
            rawMessageId = raw._id
            parsedData
            pricePerKg
            value

disconnect from MongoDB
```

### Properties
- Idempotent for each `rawMessageId`: rerunning updates the existing parsed record instead of creating another one.
- Does not delete parsed records when parsing later fails.
- Recalculates pricing and value using current pricing data.

### Complexity
- Time: $O(r)$ parser iterations plus one or more database operations per raw message, where $r$ is the number of raw messages.
- Space: $O(1)$ additional working memory besides the loaded query result.

---

# 6. Analytics and Aggregation

## 6.1 Calculate Dashboard Analytics

### Purpose
Produce total receipt count, total net weight, and total monetary value.

### Pseudocode

```text
parsedMessages = read all ParsedMessage documents
messageCount = count(parsedMessages)
totalWeight = 0
totalValue = 0

FOR each message in parsedMessages:
    totalWeight = totalWeight + (message.net if present else 0)
    totalValue = totalValue + (message.value if present else 0)

RETURN {
    messageCount,
    totalWeight,
    totalValue
}
```

### Complexity
- Time: $O(r)$ for $r$ parsed messages.
- Space: $O(1)$ if aggregation is performed in the database or streamed.

---

# 7. Sorting and Searching

## 7.1 Backend Sorting of Collections

### Purpose
Return records in a predictable order for the dashboard.

### Documented sort rules

```text
RawMessage       -> createdAt descending
ParsedMessage    -> createdAt descending
Vendor           -> name ascending
Pricing          -> product ascending
```

### Pseudocode

```text
FUNCTION listRawMessages():
    RETURN database.find(RawMessage).sort(createdAt descending)

FUNCTION listParsedMessages():
    RETURN database.find(ParsedMessage).sort(createdAt descending)

FUNCTION listVendors():
    RETURN database.find(Vendor).sort(name ascending)

FUNCTION listPricing():
    RETURN database.find(Pricing).sort(product ascending)
```

### Complexity
- Database sorting is typically $O(n \log n)$ without a suitable index.
- With a supporting index, the database can often return sorted results more efficiently.

---

## 7.2 Client Register Search/Filter

### Purpose
Filter displayed parsed receipts by party, vehicle, or receipt number.

### Pseudocode

```text
FUNCTION filterMessages(messages, query):
    q = lowercase(query)
    filtered = empty list

    FOR each message in messages:
        partyMatch = lowercase(message.party or "") contains q
        vehicleMatch = lowercase(message.vehicle or "") contains q
        receiptMatch = lowercase(message.receipt or "") contains q

        IF partyMatch OR vehicleMatch OR receiptMatch:
            append message to filtered

    RETURN filtered
```

### Properties
- Case-insensitive.
- Partial substring matching.
- Uses OR logic across the three searchable fields.
- An empty query matches every message because every string contains the empty string.

### Complexity
- Time: $O(r \times s)$, where $r$ is the number of records and $s$ is the average searchable field length.
- Space: $O(r)$ for the filtered result.

---

# 8. Authentication Algorithms

## 8.1 Session Check on Application Start

### Purpose
Decide whether to display the login screen or the authenticated dashboard.

### Pseudocode

```text
ON App mount:
    checking = true
    request GET /auth/me with session credentials

    IF response succeeds:
        user = response.user
        checking = false
    ELSE:
        user = null
        checking = false

IF checking:
    display loading state
ELSE IF user exists:
    display Dashboard
ELSE:
    display Login
```

---

## 8.2 Login

### Purpose
Authenticate a user and establish a session cookie.

### Pseudocode

```text
FUNCTION submitLogin(username, password):
    clear previous error
    send POST /auth/login with username and password

    IF response is successful:
        set current client user to username
    ELSE:
        display invalid-credentials error

    IF network request fails:
        display server-unreachable error
```

### Backend behavior
- Credentials are documented as in-memory credentials.
- Successful login creates an `express-session` session cookie.

---

## 8.3 Logout

### Pseudocode

```text
FUNCTION logout():
    send POST /auth/logout with session credentials
    after response:
        clear current client user
        display Login
```

---

## 8.4 Protected Upload Authorization

### Pseudocode

```text
FUNCTION requireAuth(request, response, next):
    IF request session contains authenticated user:
        call next()
    ELSE:
        return HTTP 401 Unauthorized
```

The documented protected route is `POST /upload`.

---

# 9. Input Validation Algorithms

## 9.1 Vendor Validation

### Purpose
Prevent creation of a vendor without a name.

### Pseudocode

```text
FUNCTION submitVendor(name, location):
    IF trim(name) is empty:
        display "Vendor name is required"
        STOP

    send POST /vendors with:
        name = trim(name)
        location = trim(location)

    clear form
    reload vendor list
```

### Database constraint
- `Vendor.name` is required by the Mongoose schema.

---

## 9.2 Pricing Validation

### Purpose
Prevent invalid product prices from being submitted.

### Pseudocode

```text
FUNCTION submitPricing(product, price):
    IF trim(product) is empty:
        display "Product name is required"
        STOP

    IF price is empty OR price is not numeric OR numeric(price) <= 0:
        display "Enter a valid price"
        STOP

    send POST /pricing with:
        product = trim(product)
        pricePerKg = numeric(price)

    clear form
    reload pricing list
```

### Database constraints
- `Pricing.product` is required and unique.
- `Pricing.pricePerKg` is required.

---

## 9.3 Message Upload Validation

### Pseudocode

```text
FUNCTION handleUpload(file):
    IF no file is selected:
        display "Select a JSON file first"
        STOP

    create multipart form data
    append file under field name "file"
    send authenticated POST /upload

    IF response fails:
        display returned error or generic upload error
    ELSE:
        display processed and duplicate counts
        notify dashboard to refresh
```

---

# 10. Frontend State and Refresh Algorithms

## 10.1 Refresh After Successful Upload

### Purpose
Ensure the register displays newly uploaded messages without a full page reload.

### Pseudocode

```text
Dashboard owns refreshKey = 0

FUNCTION refresh():
    refreshKey = refreshKey + 1

Upload succeeds:
    call onUploadSuccess()
    Dashboard.refresh() increments refreshKey

Messages observes refreshKey:
    whenever refreshKey changes:
        fetch /processed again
        replace displayed messages
```

---

## 10.2 Loading and Error State Handling

### Pseudocode

```text
ON data request:
    loading = true
    error = null

IF request succeeds:
    store response data
    loading = false

IF response has an HTTP error:
    store server error message
    clear data when appropriate
    loading = false

IF network request throws:
    store connectivity error
    loading = false

RENDER:
    IF loading: show loading message
    ELSE IF error: show error message
    ELSE IF data is empty: show empty-state message
    ELSE: show data
```

---

# 11. Data Model and Algorithm Dependencies

```text
RawMessage
    |
    | rawMessageId reference
    v
ParsedMessage ---- product lookup ----> Pricing
       |
       | net * pricePerKg
       v
     value

Vendor is maintained as a separate master-data collection.
The documented UML view associates ParsedMessage.company with Vendor.
```

## Main dependency sequence

```text
Input SMS
   -> validate and normalize
   -> split into lines or CSV-like fields
   -> recognize labels
   -> extract values
   -> build ParsedMessage data
   -> check exact duplicate
   -> save RawMessage
   -> lookup Pricing
   -> calculate value
   -> save ParsedMessage
   -> aggregate or display results
```

---

# 12. Algorithms Not Present in This Project

The screenshots supplied as a reference show algorithms from a different car-record application, such as SQL `INSERT`, `UPDATE`, and `DELETE`, voice recognition, graph generation, and year/price validation. Those algorithms are **not implemented in this SMS dashboard** and are intentionally not claimed as project features.

This project does **not** contain documented implementations of:

- Binary search or sorting implemented manually in application code.
- Voice recognition.
- Graph plotting.
- SQL CRUD operations.
- Car year-range validation.
- SQL `LIKE` search over a cars table.

The project uses database sorting, exact duplicate lookup, client-side substring filtering, parser regular expressions, and numeric aggregation instead.

---

# 13. Testing Strategies

The following table presents the application testing strategy in the same
format as a formal project-submission test plan.

| Success Criteria | Testing Strategy | Expected Result |
|---|---|---|
| 1. Validate SMS input and parsing | Submit an empty message, whitespace-only message, malformed message, and valid messages using `G:`, `T:`, `N:`, `R:`, `D:`, `VE-`, `PR-`, `PA-`, and `TP-` formats. Also test Windows line endings and a single-line comma-separated message. | Invalid or empty input is rejected with an error. Valid input is normalized and the company, receipt, weights, dates, vehicle, product, party, and location are extracted correctly. |
| 2. Add a new receipt | Enter or upload a valid SMS and verify that the original text is stored and a structured parsed receipt appears in the register. | A `RawMessage` and related `ParsedMessage` are created. The parsed receipt is displayed with its receipt number, date, vehicle, party, net weight, price, and value. |
| 3. Prevent duplicate receipts | Submit the same SMS twice, including a second copy with extra leading or trailing whitespace. | The first valid message is stored. The second normalized copy is identified as a duplicate, is not inserted again, and is reported in the upload result. |
| 4. Process bulk uploads | Upload a JSON array containing string items, `{ text }` objects, duplicate messages, invalid items, and messages shorter than five characters. Also upload plain text containing blank-line-separated messages. | Valid new messages are processed, duplicates are counted separately, invalid or short items are skipped, and the response reports `processed`, `duplicates`, `skipped`, and `results` accurately. |
| 5. Validate and apply product pricing | Add a blank product, a non-numeric price, zero, and a negative price. Then save a valid product price and process a receipt containing that product. | Invalid prices are rejected. A valid price is saved or updated. Matching receipts use the configured `pricePerKg`; receipts without a matching price use zero. |
| 6. Calculate receipt value correctly | Configure a product price, submit a receipt with a known net weight, and compare the displayed value with `net × pricePerKg`. Test a receipt with no net weight or no configured price. | The value equals `(net ?? 0) × pricePerKg`. Missing net weight or pricing does not cause a crash and produces a zero-based calculation. |
| 7. Search and sort receipt records | Load several receipts, search using complete and partial party, vehicle, and receipt values with different letter cases, then inspect the returned list order. | Search is case-insensitive, supports partial matches, combines the three fields with OR logic, and an empty search displays all receipts. Backend lists follow their documented date/name/product sort order. |
| 8. Manage vendors | Submit a vendor with a blank name, then submit valid name and location values. Reload the Vendors tab and inspect the list. | Blank vendor names are rejected. Valid vendors are stored, displayed, and returned in name order with the location preserved. |
| 9. Reparse existing records | Change or add a product price, run the reparse utility, and inspect parsed records that already have a `rawMessageId`. | Existing parsed records are updated rather than duplicated. Current parser output, pricing, and calculated value are applied to each successfully reparsed raw message. |
| 10. Display analytics | Store several parsed receipts with known net weights and values, open the Analytics tab, and compare the dashboard totals with manual totals. | The application displays the correct message count, total net weight, and total value. Empty data returns zero-style totals rather than incorrect values. |
| 11. Authenticate users and protect uploads | Open the application without a session, try invalid credentials, log in with valid credentials, log out, and attempt the protected upload route without authentication. | Unauthenticated users see Login, invalid credentials show an error, valid credentials open the Dashboard, logout clears the session, and unauthorized uploads return HTTP 401. |
| 12. Handle loading, errors, and refreshes | Disconnect the backend during data loading, submit invalid requests, upload a valid file, and switch between dashboard tabs. | Loading and error states are shown clearly, network failures do not crash the UI, and a successful upload refreshes the register without a full page reload. |

## Testing Checklist

Use the following cases when demonstrating or testing the algorithms:

- Empty SMS is rejected.
- Whitespace-only SMS is rejected.
- Windows and Unix line endings produce the same parsed result.
- Single-line comma-separated input is split correctly.
- `G:`, `T:`, and `N:` values are extracted independently.
- Weight values containing commas are converted correctly.
- `DATE:` followed by `TIME:` produces one combined date-time entry.
- `VE-`, `PR-`, `PA-`, and `TP-` fields are mapped correctly.
- The first unrecognized line becomes the company.
- A second upload of identical trimmed text is classified as a duplicate.
- Upload items shorter than five characters are skipped.
- JSON string items and `{ text }` items are both accepted.
- Plain text separated by blank lines is processed as multiple messages.
- Missing product pricing produces `pricePerKg = 0`.
- Receipt value equals net weight multiplied by price per kilogram.
- Reparsing updates an existing parsed record rather than duplicating it.
- Vendor names cannot be blank.
- Prices must be numeric and greater than zero in the client form.
- Register search matches party, vehicle, and receipt case-insensitively.
- Login failure shows an error; successful login shows the dashboard.
- Upload success refreshes the message register.
- Analytics returns count, total net weight, and total value.

---

## Source References

- [server/reparse.js](server/reparse.js) — parser, schemas, pricing lookup, value calculation, and reparsing implementation.
- [client/src/App.js](client/src/App.js) — client filtering, validation, authentication state, upload handling, loading/error states, and refresh behavior.
- [FULL_DOCUMENTATION.md](FULL_DOCUMENTATION.md) — documented backend algorithms, routes, and schema behavior.
- [DOCUMENTATION.md](DOCUMENTATION.md) — project-level algorithm and API summary.
- [openapi.yaml](openapi.yaml) — API contracts and response structures.
