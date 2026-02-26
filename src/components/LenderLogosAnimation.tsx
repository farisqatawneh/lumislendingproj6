import happyMoneyLogo from '../assets/0x0_(1).png';
import oppLoansLogo from '../assets/0x0_(2).png';
import bestEggLogo from '../assets/0x0.png';
import lightStreamLogo from '../assets/7567b933-5b4e-48bd-a7df-52c33f621afb.jpg';
import creditFreshLogo from '../assets/creditfresh-logo-400x300.webp';
import sofiLogo from '../assets/f8a930b993bb8a5475fc2dfca70963e9.png';
import elevateLogo from '../assets/images.png';
import oneMainLogo from '../assets/OneMain_logo.png';
import prosperLogo from '../assets/Prosper_Marketplace.jpg';
import lendingClubLogo from '../assets/unnamed.webp';
import upgradeLogo from '../assets/upgradelogo_fullcolor_h_logo.jpg';

const lenderLogos = [
  { src: happyMoneyLogo, alt: 'Happy Money' },
  { src: oppLoansLogo, alt: 'OppLoans' },
  { src: bestEggLogo, alt: 'Best Egg' },
  { src: lightStreamLogo, alt: 'LightStream' },
  { src: creditFreshLogo, alt: 'CreditFresh' },
  { src: sofiLogo, alt: 'SoFi' },
  { src: elevateLogo, alt: 'Elevate' },
  { src: oneMainLogo, alt: 'OneMain Financial' },
  { src: prosperLogo, alt: 'Prosper' },
  { src: lendingClubLogo, alt: 'LendingClub' },
  { src: upgradeLogo, alt: 'Upgrade' },
];

export function LenderLogosAnimation() {
  const duplicatedLogos = [...lenderLogos, ...lenderLogos];

  return (
    <div className="w-full overflow-hidden mb-6">
      <div className="relative h-20 flex items-center">
        <div className="animate-scroll flex items-center gap-12">
          {duplicatedLogos.map((logo, index) => (
            <div key={index} className="flex-shrink-0">
              <img
                src={logo.src}
                alt={logo.alt}
                className="h-12 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 15s linear infinite;
          width: max-content;
        }
      `}</style>
    </div>
  );
}
