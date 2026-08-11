"use client";
import { Card, Table, Text } from "@mantine/core";

/**
 * Shared dense-table primitive for every data page (deposits, charging,
 * sessions, credits, users, kiosks, alerts, ml-review), per
 * docs/planning/02-design-mandate.md SS3: "compact tables (36px rows),
 * 12-13px table text... no card-per-metric sprawl." Replaces raw
 * <table>+glassmorphism markup that predated the Mantine rebuild and was
 * never actually touched by it (found 2026-08-11 — every data page still
 * had backdrop-blur panels and ad-hoc rgba(255,255,255,X) text colors).
 *
 * `mono: true` columns use the theme's IBM Plex Mono family, per SS3's
 * "IBM Plex Mono for every telemetry number - voltage, current, watts,
 * bin %, credits, countdowns."
 */
export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyMessage: string;
  getRowKey: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage,
  getRowKey,
}: DataTableProps<T>) {
  return (
    <Card withBorder p={0} radius="md">
      <Table.ScrollContainer minWidth={620}>
        <Table highlightOnHover horizontalSpacing="md" verticalSpacing={0}>
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th
                  key={col.key}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "10px 16px",
                    textAlign: col.align ?? "left",
                  }}
                >
                  {col.label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.length === 0 ? (
              <Table.Tr>
                <Table.Td
                  colSpan={columns.length}
                  style={{ padding: "48px 16px" }}
                >
                  <Text c="dimmed" size="sm" ta="center">
                    {emptyMessage}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              data.map((row) => (
                <Table.Tr key={getRowKey(row)} style={{ height: 36 }}>
                  {columns.map((col) => (
                    <Table.Td
                      key={col.key}
                      style={{
                        fontSize: 12.5,
                        padding: "8px 16px",
                        textAlign: col.align ?? "left",
                        fontFamily: col.mono
                          ? "var(--mantine-font-family-monospace)"
                          : undefined,
                        fontFeatureSettings: col.mono ? '"tnum"' : undefined,
                      }}
                    >
                      {col.render(row)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
