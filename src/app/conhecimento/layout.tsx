export default function ConhecimentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <div className="animate-fade-in mx-auto w-full max-w-[1200px]">
        {children}
      </div>
    </div>
  );
}
