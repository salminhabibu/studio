import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/home');
  return null; // Redirect happens on the server, so this component won't render.
}
