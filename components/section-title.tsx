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
      <p className="curator-kicker">{eyebrow}</p>
      <div className="space-y-3">
        <h2 className="curator-display max-w-3xl text-4xl text-[color:var(--curator-ink)] sm:text-5xl">
          {title}
        </h2>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
