import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Dark navy toast with an aqua check, as in the Raghwa design (light-only app, no theme switching). */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      duration={3000}
      className="toaster group"
      icons={{
        success: <span className="ms text-aqua" style={{ fontSize: 20 }}>check_circle</span>,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-2.5 rounded-[14px] bg-foreground px-[18px] py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(11,27,58,.3)] max-w-[calc(100vw-32px)]",
          icon: "text-aqua",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
