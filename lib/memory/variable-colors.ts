export type VariableColor = {
  id: string;
  fill: string;
  selectedFill: string;
  stroke: string;
};

export const VARIABLE_COLORS: readonly VariableColor[] = [
  { id: "blue", fill: "rgba(59, 111, 232, 0.40)", selectedFill: "rgba(59, 111, 232, 0.74)", stroke: "#3B6FE8" },
  { id: "purple", fill: "rgba(139, 92, 246, 0.38)", selectedFill: "rgba(139, 92, 246, 0.72)", stroke: "#8B5CF6" },
  { id: "green", fill: "rgba(16, 150, 110, 0.40)", selectedFill: "rgba(16, 150, 110, 0.72)", stroke: "#10966E" },
  { id: "orange", fill: "rgba(214, 122, 36, 0.42)", selectedFill: "rgba(214, 122, 36, 0.74)", stroke: "#D67A24" },
  { id: "pink", fill: "rgba(208, 78, 138, 0.38)", selectedFill: "rgba(208, 78, 138, 0.70)", stroke: "#D04E8A" },
  { id: "teal", fill: "rgba(14, 148, 156, 0.40)", selectedFill: "rgba(14, 148, 156, 0.72)", stroke: "#0E949C" },
];

export function variableColor(index: number): VariableColor {
  return VARIABLE_COLORS[index % VARIABLE_COLORS.length];
}

export function variableColorIndex(colorId: string): number {
  const index = VARIABLE_COLORS.findIndex((color) => color.id === colorId);
  return index === -1 ? 0 : index;
}
