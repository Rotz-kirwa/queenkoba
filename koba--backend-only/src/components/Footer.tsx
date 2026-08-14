import { Instagram } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <p className="font-display text-xl font-semibold text-primary mb-1">Queen Koba</p>
          <p className="text-xs text-muted-foreground font-body">Nairobi, Kenya</p>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://instagram.com/QueenKobaGlow"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="w-4 h-4" />
            <span className="font-body text-sm">@QueenKobaGlow</span>
          </a>
          <span className="text-muted-foreground/50 font-body text-sm">#QueenKobaGlow</span>
        </div>

        <p className="text-xs text-muted-foreground font-body">© 2026 Queen Koba. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
