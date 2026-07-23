// Auth layout — full screen centered, no sidebar
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
