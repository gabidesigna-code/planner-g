import type { DragEvent } from "react";

const TYPE = "text/task-id";

export const dragProps = (id: string) => ({
  draggable: true,
  onDragStart: (e: DragEvent) => {
    e.dataTransfer.setData(TYPE, id);
    e.dataTransfer.effectAllowed = "move";
  },
});

export const isTaskDrag = (e: DragEvent) => e.dataTransfer.types.includes(TYPE);
export const draggedId = (e: DragEvent) => e.dataTransfer.getData(TYPE);
