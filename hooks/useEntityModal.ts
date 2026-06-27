"use client";

import { useState } from "react";

type ModalMode = "create" | "edit";

interface EntityModalState<T> {
  open: boolean;
  mode: ModalMode;
  entity: T | null;
}

export function useEntityModal<T>() {
  const [state, setState] = useState<EntityModalState<T>>({
    open: false,
    mode: "create",
    entity: null,
  });

  const openCreate = () => {
    setState({ open: true, mode: "create", entity: null });
  };

  const openEdit = (entity: T) => {
    setState({ open: true, mode: "edit", entity });
  };

  const close = () => {
    setState((prev) => ({ ...prev, open: false }));
  };

  return {
    open: state.open,
    mode: state.mode,
    entity: state.entity,
    openCreate,
    openEdit,
    close,
  };
}
