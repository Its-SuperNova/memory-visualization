export const C_DATA_TYPES = ["char", "short", "int", "long", "long long", "float", "double"] as const;

export type CDataType = (typeof C_DATA_TYPES)[number];

/**
 * Educational sizes for this lesson. A real C compiler can choose different
 * sizes for short, int, long, and long long.
 */
export const C_TYPE_SIZES: Record<CDataType, number> = {
  char: 1,
  short: 2,
  int: 4,
  long: 4,
  "long long": 8,
  float: 4,
  double: 8,
};

export type ParsedVariable = {
  name: string;
  type: CDataType;
  value: string | null;
  sizeInBytes: number;
  lineNumber: number;
  column: number;
  endColumn: number;
};

export type ParseIssue = {
  lineNumber: number;
  column: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning";
};

export type ParseResult = {
  variables: ParsedVariable[];
  issues: ParseIssue[];
};

export const DEFAULT_C_PROGRAM = `#include <stdio.h>

int main() {
    int age = 20;
    char grade = 'A';
    float price = 99.5;

    return 0;
}
`;
