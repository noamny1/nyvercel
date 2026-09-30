import Link from "next/link";

export default function Home() {
  return (
    <main className="admin">
      <h1>NYTV</h1>
      <p>הניהול נמצא במסך הכניסה. כל מסך בניין נפתח בכתובת משלו.</p>
      <p><Link href="/admin">כניסה לניהול</Link></p>
    </main>
  );
}
