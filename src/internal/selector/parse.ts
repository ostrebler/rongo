import { SelectArgument } from ".";

// This is the grammar of Selectors :
//
// selector:
// | <field> selector                        { FieldSelector(field, arg, selector) }
// | <index> selector                        { IndexSelector(index, selector) }
// | <$> selector                            { MapSelector(selector) }
// | <$$> selector                           { FlatMapSelector(selector) }
// | <arg as object> selector                { FilterSelector(arg, selector) }
// | <arg as function> selector              { PredicateSelector(arg, selector) }
// | <arg as selector>                       { arg }
// | <[> (selector <,>?)* <]>                { TupleSelector(...[selector]) }
// | <{> ((<field>|<*>) selector <,>?)* <}>  { ObjectSelector(...[field, selector]) }
// | <>                                      { IdentitySelector }
//
// spacing:
// | <[.\s]+>

export function parse(
  raw: string,
  symTable: Map<string, SelectArgument> = new Map()
) {}
