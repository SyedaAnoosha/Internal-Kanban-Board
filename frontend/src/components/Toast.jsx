import { Toaster, toast as sonnerToast } from 'sonner'

export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster 
        richColors 
        position="bottom-right" 
        theme="light"
        expand={false}
        toastOptions={{
          classNames: {
            toast: "font-sans text-sm shadow-lg border border-border",
            title: "font-semibold text-text-1",
            description: "text-text-2",
          }
        }}
      />
    </>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return {
    showToast: (message, type = 'success') => {
      if (type === 'error') {
        sonnerToast.error(message)
      } else {
        sonnerToast.success(message)
      }
    }
  }
}