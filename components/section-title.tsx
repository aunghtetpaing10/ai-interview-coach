import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
};

export function SectionTitle({
  eyebrow,
  title,
  description,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-[#1638d4]">
        {eyebrow}
      </p>
      <div className="space-y-3">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          {title}
        </h2>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          {description}
        </p>
      </div>
    </div>
  );
}
