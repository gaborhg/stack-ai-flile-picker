"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Yes",
  cancelLabel = "No",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isConfirming}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
