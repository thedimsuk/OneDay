declare module "lucide-react" {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

  export type LucideProps = SVGProps<SVGSVGElement> & {
    absoluteStrokeWidth?: boolean;
    size?: string | number;
    strokeWidth?: string | number;
  };

  export type LucideIcon = ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;

  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Banknote: LucideIcon;
  export const Bell: LucideIcon;
  export const Boxes: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Clock: LucideIcon;
  export const Clock3: LucideIcon;
  export const CreditCard: LucideIcon;
  export const Crown: LucideIcon;
  export const Download: LucideIcon;
  export const Edit3: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Flame: LucideIcon;
  export const Hand: LucideIcon;
  export const Home: LucideIcon;
  export const ImagePlus: LucideIcon;
  export const KeyRound: LucideIcon;
  export const LockKeyhole: LucideIcon;
  export const LogOut: LucideIcon;
  export const MailCheck: LucideIcon;
  export const MapPin: LucideIcon;
  export const Minus: LucideIcon;
  export const MoveUpRight: LucideIcon;
  export const PackageCheck: LucideIcon;
  export const Plus: LucideIcon;
  export const QrCode: LucideIcon;
  export const ReceiptText: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Save: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const Smile: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Star: LucideIcon;
  export const TicketCheck: LucideIcon;
  export const TicketPercent: LucideIcon;
  export const Trash2: LucideIcon;
  export const TriangleAlert: LucideIcon;
  export const Truck: LucideIcon;
  export const UserRound: LucideIcon;
  export const Volume2: LucideIcon;
  export const WalletCards: LucideIcon;
  export const X: LucideIcon;
  export const Zap: LucideIcon;
}
