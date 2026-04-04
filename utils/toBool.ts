export function toBool<Type>(value: Type): boolean {
  if (value === undefined) {
    return false;
  } else if (typeof value === "string" && value.toLowerCase() === "false") {
    return false;
  } else {
    return !!value;
  }
}
