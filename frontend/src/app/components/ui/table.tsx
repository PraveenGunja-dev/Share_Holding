"use client";

import * as React from "react";

import { cn } from "./utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="w-full"
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-sm",
          // Numeric / mono cells: fixed 11px at all breakpoints
          "[&_td.font-mono]:text-[11px] [&_td.font-mono]:2xl:text-[11px]",
          "[&_td.text-muted-foreground.font-black]:text-[11px] [&_td.text-muted-foreground.font-black]:2xl:text-[11px]",
          // "Change in Holding Shares" column: force 11px including inner spans
          "[&_td.change-holding-cell]:text-[11px] [&_td.change-holding-cell]:2xl:text-[11px]",
          "[&_td.change-holding-cell_span]:text-[11px] [&_td.change-holding-cell_span]:2xl:text-[11px]",
          "[&_td.change-holding-cell_.font-mono]:text-[11px] [&_td.change-holding-cell_.font-mono]:2xl:text-[11px]",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b sticky top-0 z-40 bg-background", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // Allow wrapping on smaller screens so table content can't force horizontal overflow.
        // Card tables: one consistent header size (13px) unless overridden per-column.
        "text-foreground h-10 px-2 text-left align-middle font-bold font-['Adani'] text-[13px] whitespace-normal break-words [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        // Allow wrapping on smaller screens so table content can't force horizontal overflow.
        "p-2 align-middle whitespace-normal break-words [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
