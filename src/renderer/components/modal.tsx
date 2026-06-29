import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ModalConfig = {
  title: string
  description?: string
  content?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
}

type ModalContextValue = {
  open: (config: ModalConfig) => void
  close: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ModalConfig | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((c: ModalConfig) => {
    setConfig(c)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  function handleConfirm() {
    config?.onConfirm?.()
    close()
  }

  function handleCancel() {
    config?.onCancel?.()
    close()
  }

  return (
    <ModalContext.Provider value={{ open, close }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleCancel() }}>
        {config && (
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{config.title}</DialogTitle>
              {config.description && (
                <DialogDescription>{config.description}</DialogDescription>
              )}
            </DialogHeader>
            {config.content && <div className="py-1">{config.content}</div>}
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                {config.cancelLabel ?? "Cancel"}
              </Button>
              {config.onConfirm && (
                <Button size="sm" onClick={handleConfirm}>
                  {config.confirmLabel ?? "Confirm"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error("useModal must be used inside ModalProvider")
  return ctx
}
