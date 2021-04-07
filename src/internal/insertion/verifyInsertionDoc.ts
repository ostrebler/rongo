import { OptionalId } from "mongodb";
import { Collection, Document } from "../../.";

export function verifyInsertionDoc<T extends Document>(
  collection: Collection<T>,
  doc: OptionalId<T> | Array<OptionalId<T>>
) {
  // TODO implement
}
