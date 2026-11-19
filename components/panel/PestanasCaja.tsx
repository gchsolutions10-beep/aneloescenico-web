import Link from "next/link";

/** Pestañas que unen la venta con su cierre: son la misma caja vista en dos momentos. */
export default function PestanasCaja({ actual }: { actual: "vender" | "cierre" }) {
  return (
    <nav className="subrayadas" aria-label="Caja">
      <Link href="/admin/taquilla" aria-current={actual === "vender" ? "page" : undefined}>Vender</Link>
      <Link href="/admin/caja" aria-current={actual === "cierre" ? "page" : undefined}>Cierre de caja</Link>
    </nav>
  );
}

