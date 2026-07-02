"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LeaveCourseDialogProps {
  open: boolean;
  courseName: string;
  isLeaving: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function LeaveCourseDialog({
  open,
  courseName,
  isLeaving,
  onConfirm,
  onCancel,
}: LeaveCourseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave course?</DialogTitle>
          <DialogDescription>
            You will leave &apos;{courseName}&apos; and it will no longer appear
            in your enrolled courses. The course itself will not be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLeaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLeaving}
          >
            {isLeaving ? "Leaving..." : "Leave course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
