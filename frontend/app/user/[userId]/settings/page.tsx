import { redirect } from 'next/navigation';

export default function SettingsIndexPage({ params }: { params: { userId: string } }) {
  redirect(`/user/${params.userId}/settings/profile`);
}
