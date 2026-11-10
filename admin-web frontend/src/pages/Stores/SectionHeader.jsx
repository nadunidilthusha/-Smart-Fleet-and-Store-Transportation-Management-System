// Shared section header with icon, title, subtitle, and step badge

export default function SectionHeader({ icon, title, subtitle, step }) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    {icon}
                </span>
                <div>
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-[-11px] font-semibold">
                {step}
            </span>
        </div>
    )
}