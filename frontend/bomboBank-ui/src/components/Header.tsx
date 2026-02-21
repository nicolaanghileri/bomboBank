interface HeaderProps {
    title: string
    description?: string
}

export function Header({ title, description }: HeaderProps) {
    return (
        <header className="flex h-16 shrink-0 items-center border-b px-8">
            <div>
                <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
        </header>
    )
}
