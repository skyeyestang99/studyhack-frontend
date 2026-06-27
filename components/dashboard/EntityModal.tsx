"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select";
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface EntityModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  title: string;
  fields: FieldConfig[];
  initialValues?: Record<string, string>;
  isSubmitting: boolean;
}

export function EntityModal({
  open,
  onClose,
  onSubmit,
  title,
  fields,
  initialValues,
  isSubmitting,
}: EntityModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form values and errors when modal opens/closes
  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      fields.forEach((field) => {
        initial[field.name] = initialValues?.[field.name] ?? "";
      });
      setValues(initial);
      setErrors({});
    }
  }, [open, fields, initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.required && !values[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    await onSubmit(values);
  };

  const handleTextChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the fields below and click save.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === "text" ? (
                <Input
                  id={field.name}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleTextChange(field.name, e.target.value)}
                />
              ) : (
                <Select
                  value={values[field.name] ?? ""}
                  onValueChange={(val) => handleSelectChange(field.name, val)}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue
                      placeholder={field.placeholder ?? "Select..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors[field.name] && (
                <p className="text-sm text-destructive">{errors[field.name]}</p>
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
