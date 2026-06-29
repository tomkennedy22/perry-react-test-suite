import "./styles.css"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter, createHashHistory } from "@tanstack/react-router"
import { Toaster } from "sonner"
import { ModalProvider } from "@/components/modal"
import { ThemeProvider } from "@/hooks"
import { queryClient } from "./api/query"
import { routeTree } from "./routeTree.gen"

const history = createHashHistory()
const router = createRouter({ routeTree, history })

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ModalProvider>
        <RouterProvider router={router} />
        <Toaster theme="dark" position="bottom-right" />
      </ModalProvider>
    </ThemeProvider>
  </QueryClientProvider>
)
