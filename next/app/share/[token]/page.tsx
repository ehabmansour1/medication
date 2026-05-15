import SharedLabs from "@/components/SharedLabs";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedLabs token={token} />;
}
