# UML Class Diagram — SMS Ingestion Dashboard

This UML class diagram represents the persistent MongoDB/Mongoose models and the backend service operations that parse, store, price, and reprocess SMS messages.

```mermaid
classDiagram
    class RawMessage {
        +id: ObjectId {PK}
        +text: String {required}
        +source: String
        +createdAt: Date
        %% source defaults to "manual"
    }

    class ParsedMessage {
        +id: ObjectId {PK}
        +rawMessageId: ObjectId {FK}
        +company: String
        +receipt: String
        +gross: Number
        +tare: Number
        +net: Number
        +vehicle: String
        +product: String
        +party: String
        +location: String
        +dates: String[]
        +pricePerKg: Number
        +value: Number
        +createdAt: Date
        %% pricePerKg defaults to 0
    }

    class Vendor {
        +id: ObjectId {PK}
        +name: String {required}
        +location: String
        +createdAt: Date
        %% location defaults to ""
    }

    class Pricing {
        +id: ObjectId {PK}
        +product: String {unique}
        +pricePerKg: Number {required}
        +createdAt: Date
    }

    class SMSIngestionService {
        +parseMessage(text: String) ParsedMessage
        +storeMessage(text: String, source: String) RawMessage
        +reparseMessages() void
        +calculateValue(net: Number, price: Number) Number
    }

    RawMessage "1" --> "0..1" ParsedMessage : rawMessageId
    ParsedMessage "0..*" --> "1" Vendor : company
    ParsedMessage --> Pricing : product lookup
    SMSIngestionService ..> RawMessage : uses
    SMSIngestionService ..> ParsedMessage : uses
```

## Class Descriptions

| Class | Description |
| --- | --- |
| `RawMessage` | Stores the original SMS text received through manual entry or upload. |
| `ParsedMessage` | Stores structured receipt data extracted from a raw SMS. |
| `Pricing` | Stores the unique price per kilogram for each product. |
| `Vendor` | Stores vendor master data and location information associated with parsed messages. |
| `SMSIngestionService` | Logical backend service representing parsing, storage, pricing, and reparsing operations. |

## Relationship Notes

- One `RawMessage` may produce zero or one `ParsedMessage`, because parsing can fail.
- `ParsedMessage.rawMessageId` is a stored foreign-key reference to `RawMessage._id`.
- `ParsedMessage.company` is associated with `Vendor` through the `company` relationship label.
- `ParsedMessage.product` is associated with `Pricing` through the `product lookup` relationship.
- `ParsedMessage.value` is calculated as `(net ?? 0) * pricePerKg`.

## UML Visibility and Key Legend

- `+` — public attribute or operation.
- `PK` — primary key represented by MongoDB `_id`.
- `FK` — foreign-key reference.
- `unique` — unique business key.
- Solid arrow — direct association/reference.
- Dashed arrow — service dependency.
