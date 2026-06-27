"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
}

export interface EntityTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onRowClick?: (item: T) => void;
}

export function EntityTable<T extends { id: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  onRowClick,
}: EntityTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={String(col.key)}>{col.header}</TableHead>
          ))}
          <TableHead className="w-[50px]">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow
            key={item.id}
            className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
            onClick={() => onRowClick?.(item)}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={(event) => {
              if (!onRowClick) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onRowClick(item);
              }
            }}
          >
            {columns.map((col) => (
              <TableCell key={String(col.key)}>
                {col.render
                  ? col.render(item[col.key], item)
                  : String(item[col.key] ?? "")}
              </TableCell>
            ))}
            <TableCell onClick={(event) => event.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(item)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
