import { redirect } from 'next/navigation';

/** The active customer entry point is MS BEAUTY's published review page. */
export default function HomePage() {
  redirect('/r/ms-beauty/baltimore');
}
