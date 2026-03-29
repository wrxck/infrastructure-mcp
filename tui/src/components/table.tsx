import React from "react";
import { Text } from "ink";
import stringWidth from "string-width";

interface Column {
  key: string;
  header: string;
  width?: number;
  align?: "left" | "right";
}

interface TableProps {
  columns: Column[];
  rows: Record<string, string | number>[];
  selectedIndex?: number;
  maxWidth?: number;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function visibleWidth(text: string): number {
  return stringWidth(text);
}

function truncate(text: string, maxW: number): string {
  if (visibleWidth(text) <= maxW) return text;
  let width = 0;
  let result = "";
  for (const char of text) {
    const cw = visibleWidth(char);
    if (width + cw + 1 > maxW) {
      return result + "\u2026";
    }
    result += char;
    width += cw;
  }
  return result;
}

function pad(text: string, width: number, align: "left" | "right" = "left"): string {
  const tw = visibleWidth(text);
  const diff = width - tw;
  if (diff <= 0) return text;
  const spaces = " ".repeat(diff);
  return align === "right" ? spaces + text : text + spaces;
}

function computeWidths(
  columns: Column[],
  rows: Record<string, string | number>[],
  maxWidth?: number,
): number[] {
  const widths = columns.map((col) => {
    const headerW = visibleWidth(col.header) + 2; // 1 padding each side
    const minFromCol = col.width ?? headerW;
    return Math.max(headerW, minFromCol);
  });

  for (const row of rows) {
    for (let i = 0; i < columns.length; i++) {
      const cellW = visibleWidth(cellText(row[columns[i].key])) + 2;
      widths[i] = Math.max(widths[i], cellW);
    }
  }

  if (maxWidth !== undefined) {
    // Total: │ col1 │ col2 │ ... → borders = columns.length + 1
    const bordersWidth = columns.length + 1;
    const totalContent = widths.reduce((a, b) => a + b, 0);
    const totalWidth = totalContent + bordersWidth;

    if (totalWidth > maxWidth) {
      const overflow = totalWidth - maxWidth;
      // Find widest column and shrink it
      let widestIdx = 0;
      for (let i = 1; i < widths.length; i++) {
        if (widths[i] > widths[widestIdx]) widestIdx = i;
      }
      const minW = visibleWidth(columns[widestIdx].header) + 2;
      widths[widestIdx] = Math.max(minW, widths[widestIdx] - overflow);
    }
  }

  return widths;
}

function buildLine(
  widths: number[],
  left: string,
  mid: string,
  right: string,
  fill: string,
): string {
  const segments = widths.map((w) => fill.repeat(w));
  return left + segments.join(mid) + right;
}

function buildRow(
  cells: string[],
  widths: number[],
  columns: Column[],
): string {
  const padded = cells.map((cell, i) => {
    const maxContent = widths[i] - 2; // subtract padding
    const truncated = truncate(cell, maxContent);
    const aligned = pad(truncated, maxContent, columns[i].align);
    return " " + aligned + " ";
  });
  return "\u2502" + padded.join("\u2502") + "\u2502";
}

export default function Table({ columns, rows, selectedIndex, maxWidth }: TableProps): React.ReactElement {
  if (rows.length === 0) {
    return (
      <Text>
        {"No data"}
      </Text>
    );
  }

  const widths = computeWidths(columns, rows, maxWidth);

  const topBorder = buildLine(widths, "\u250C", "\u252C", "\u2510", "\u2500");
  const headerSep = buildLine(widths, "\u251C", "\u253C", "\u2524", "\u2500");
  const bottomBorder = buildLine(widths, "\u2514", "\u2534", "\u2518", "\u2500");

  const headerCells = columns.map((col) => col.header);
  const headerRow = buildRow(headerCells, widths, columns);

  const dataRows = rows.map((row, rowIdx) => {
    const cells = columns.map((col) => cellText(row[col.key]));
    const line = buildRow(cells, widths, columns);
    const isSelected = selectedIndex !== undefined && rowIdx === selectedIndex;
    return { line, isSelected };
  });

  const lines: React.ReactElement[] = [];

  lines.push(<Text key="top">{topBorder}</Text>);
  lines.push(<Text key="header">{headerRow}</Text>);
  lines.push(<Text key="sep">{headerSep}</Text>);

  for (let i = 0; i < dataRows.length; i++) {
    const { line, isSelected } = dataRows[i];
    if (isSelected) {
      lines.push(
        <Text key={`row-${i}`} backgroundColor="blue" color="white">
          {line}
        </Text>,
      );
    } else {
      lines.push(<Text key={`row-${i}`}>{line}</Text>);
    }
  }

  lines.push(<Text key="bottom">{bottomBorder}</Text>);

  return <>{lines}</>;
}
