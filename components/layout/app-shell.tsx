import Image from "next/image";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none fixed inset-0 -z-10 app-surface"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed -right-[8%] bottom-0 -z-10 hidden h-[min(42vh,360px)] w-[min(72vw,520px)] text-foreground opacity-[0.55] sm:block lg:-right-[4%] lg:bottom-[6%] lg:h-[min(48vh,420px)] lg:w-[min(58vw,640px)] dark:opacity-[0.4]"
        aria-hidden="true"
      >
        <Image
          src="/car-silhouette.svg"
          alt=""
          width={960}
          height={420}
          className="h-full w-full object-contain object-right-bottom"
          priority
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
