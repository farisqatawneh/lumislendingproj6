import React from 'react';
import lumisLogo from '../assets/lumis_lending_logo-removebg-preview.png';
import firstChoiceLogo from '../assets/image.png';
import bbbLogo from '../assets/Accredited_Business_Black_logo.webp';
import acdrLogo from '../assets/Logo-removebg-preview.png';
import { Star } from 'lucide-react';

interface DebtItem {
  id: string;
  creditor: string;
  account_type: string;
  balance: number;
  minimum_payment: number | null;
  apr: number | null;
  utilization: number | null;
  est_interest_paid: number | null;
  est_payoff_time: string | null;
}

interface DebtReview {
  id: string;
  client_name: string;
  review_date: string;
  credit_score: number | null;
  credit_tier: string | null;
  overall_credit_utilization: number | null;
  debt_to_income_ratio: number | null;
  own_estimated_term: string | null;
  own_estimated_total_payoff: number | null;
  own_estimated_savings: number | null;
  program_estimated_term: string | null;
  program_estimated_total_payoff: number | null;
  program_estimated_savings: number | null;
  program_monthly_payment: number | null;
}

interface DebtReviewDocumentProps {
  review: DebtReview;
  debtItems: DebtItem[];
}

export const DebtReviewDocument: React.FC<DebtReviewDocumentProps> = ({ review, debtItems }) => {
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${parseFloat(value.toFixed(2))}%`;
  };

  const convertYearsToMonths = (timeStr: string | null) => {
    if (!timeStr) return 'N/A';

    const yearMatch = timeStr.match(/(\d+(?:\.\d+)?)\s*years?/i);
    if (yearMatch) {
      const years = parseFloat(yearMatch[1]);
      const months = Math.round(years * 12);
      return `${months} months`;
    }

    return timeStr;
  };

  const addMonthsToTerm = (timeStr: string | null, monthsToAdd: number) => {
    if (!timeStr) return 'N/A';

    const yearMatch = timeStr.match(/(\d+(?:\.\d+)?)\s*years?/i);
    if (yearMatch) {
      const years = parseFloat(yearMatch[1]);
      const months = Math.round(years * 12) + monthsToAdd;
      return `${months} months`;
    }

    const monthMatch = timeStr.match(/(\d+)\s*months?/i);
    if (monthMatch) {
      const months = parseInt(monthMatch[1]) + monthsToAdd;
      return `${months} months`;
    }

    return timeStr;
  };

  const calculateAdjustedPayoff = (originalTerm: string | null, originalPayoff: number | null, monthsToAdd: number) => {
    if (!originalTerm || !originalPayoff) return null;

    const yearMatch = originalTerm.match(/(\d+(?:\.\d+)?)\s*years?/i);
    let originalMonths = 0;

    if (yearMatch) {
      const years = parseFloat(yearMatch[1]);
      originalMonths = Math.round(years * 12);
    } else {
      const monthMatch = originalTerm.match(/(\d+)\s*months?/i);
      if (monthMatch) {
        originalMonths = parseInt(monthMatch[1]);
      }
    }

    if (originalMonths === 0) return originalPayoff;

    const monthlyPayment = originalPayoff / originalMonths;
    const newTotalMonths = originalMonths + monthsToAdd;
    return monthlyPayment * newTotalMonths;
  };

  const calculateAdjustedSavings = () => {
    const adjustedPayoff = calculateAdjustedPayoff(review.own_estimated_term, review.own_estimated_total_payoff, 30);
    if (!adjustedPayoff || !review.program_estimated_total_payoff) return null;
    return adjustedPayoff - review.program_estimated_total_payoff;
  };

  const getLongestPayoffTime = () => {
    const payoffTimes = debtItems
      .map(item => item.est_payoff_time)
      .filter((time): time is string => time !== null && time !== undefined);

    if (payoffTimes.length === 0) return 'N/A';

    const maxTime = payoffTimes.reduce((max, current) => {
      const maxMonths = parseInt(max.match(/\d+/)?.[0] || '0');
      const currentMonths = parseInt(current.match(/\d+/)?.[0] || '0');
      return currentMonths > maxMonths ? current : max;
    });

    return maxTime;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalDebt = debtItems.reduce((sum, item) => sum + (item.balance || 0), 0);

  const calculateProgramMonthlyPayment = () => {
    if (review.program_monthly_payment !== null) {
      return review.program_monthly_payment;
    }

    if (review.program_estimated_total_payoff === null || review.program_estimated_term === null) return null;

    const yearMatch = review.program_estimated_term.match(/(\d+(?:\.\d+)?)\s*years?/i);
    if (yearMatch) {
      const years = parseFloat(yearMatch[1]);
      const months = years * 12;
      return review.program_estimated_total_payoff / months;
    }

    return review.program_estimated_total_payoff / 48;
  };

  const getCreditUtilizationStatus = (utilization: number | null) => {
    if (utilization === null) {
      return {
        bgColor: 'from-slate-50 to-slate-100',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-800',
        valueColor: 'text-slate-900',
        labelColor: 'text-slate-700',
        color: '#64748b',
        label: 'N/A',
      };
    }

    if (utilization <= 9) {
      return {
        bgColor: 'from-green-500 to-green-600',
        borderColor: 'border-green-700',
        textColor: 'text-white',
        valueColor: 'text-white',
        labelColor: 'text-green-600',
        color: '#16a34a',
        label: 'Excellent',
      };
    } else if (utilization <= 29) {
      return {
        bgColor: 'from-lime-400 to-lime-500',
        borderColor: 'border-lime-600',
        textColor: 'text-lime-900',
        valueColor: 'text-lime-950',
        labelColor: 'text-lime-600',
        color: '#65a30d',
        label: 'Good',
      };
    } else if (utilization <= 74) {
      return {
        bgColor: 'from-orange-500 to-orange-600',
        borderColor: 'border-orange-700',
        textColor: 'text-white',
        valueColor: 'text-white',
        labelColor: 'text-orange-600',
        color: '#ea580c',
        label: 'Poor',
      };
    } else {
      return {
        bgColor: 'from-red-500 to-red-600',
        borderColor: 'border-red-700',
        textColor: 'text-white',
        valueColor: 'text-white',
        labelColor: 'text-red-600',
        color: '#dc2626',
        label: 'Very Poor',
      };
    }
  };

  const utilizationStatus = getCreditUtilizationStatus(review.overall_credit_utilization);

  const getDTIStatus = (dti: number | null) => {
    if (dti === null) {
      return {
        bgColor: 'from-slate-50 to-slate-100',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-800',
        valueColor: 'text-slate-900',
        label: 'N/A',
      };
    }

    if (dti < 36) {
      return {
        bgColor: 'from-green-500 to-green-600',
        borderColor: 'border-green-700',
        textColor: 'text-white',
        valueColor: 'text-white',
        label: 'Good',
      };
    } else if (dti <= 49) {
      return {
        bgColor: 'from-amber-600 to-amber-700',
        borderColor: 'border-amber-800',
        textColor: 'text-white',
        valueColor: 'text-white',
        label: 'Fair',
      };
    } else {
      return {
        bgColor: 'from-red-500 to-red-600',
        borderColor: 'border-red-700',
        textColor: 'text-white',
        valueColor: 'text-white',
        label: 'Bad',
      };
    }
  };

  const dtiStatus = getDTIStatus(review.debt_to_income_ratio);

  const getCreditScoreInfo = (score: number | null) => {
    if (score === null) {
      return {
        tier: 'N/A',
        color: '#94a3b8',
        position: 50,
      };
    }

    if (score >= 800) {
      return { tier: 'Exceptional', color: '#22c55e', position: 90 };
    } else if (score >= 740) {
      return { tier: 'Very Good', color: '#84cc16', position: 75 };
    } else if (score >= 670) {
      return { tier: 'Good', color: '#eab308', position: 60 };
    } else if (score >= 580) {
      return { tier: 'Fair', color: '#f97316', position: 35 };
    } else {
      return { tier: 'Poor', color: '#ef4444', position: 15 };
    }
  };

  const creditScoreInfo = getCreditScoreInfo(review.credit_score);
  const needleRotation = -90 + (creditScoreInfo.position * 1.8);

  const getUtilizationPosition = (utilization: number | null) => {
    if (utilization === null) return 50;
    return Math.min(utilization, 100);
  };

  const utilizationPosition = getUtilizationPosition(review.overall_credit_utilization);
  const utilizationNeedleRotation = -90 + (utilizationPosition * 1.8);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 print:bg-white print:p-0 overflow-auto md:p-0">
      <div
        className="debt-review-container mx-auto bg-white shadow-2xl md:rounded-xl overflow-hidden print:shadow-none print:rounded-none"
        style={{
          width: '100%',
          maxWidth: '210mm',
          minHeight: '297mm',
        }}
      >
        <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-3 md:p-5 print:bg-teal-800">
          <div className="mb-2 md:mb-3">
            <h1 className="text-lg md:text-2xl font-bold">
              Financial Analysis{' '}
              <span className="text-[10px] md:text-xs font-normal text-teal-200">{formatDate(review.review_date)}</span>
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-3 mt-2 md:mt-3 text-xs md:text-sm">
            <div>
              <p className="text-teal-200 font-medium text-[9px] md:text-xs">Client Name</p>
              <p className="text-xs md:text-base font-semibold mt-0.5">{review.client_name}</p>
            </div>
            <div>
              <p className="text-teal-200 font-medium text-[9px] md:text-xs">Prepared By</p>
              <p className="text-xs md:text-base font-semibold mt-0.5">{review.prepared_by || '[Agent Name]'}</p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          <section>
            <div className="mb-4 pb-2 border-b-2 border-teal-200 flex items-start justify-between">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 mt-2 md:mt-3">1. Creditworthiness Overview</h2>
              <img src={lumisLogo} alt="Lumis Lending" className="h-16 md:h-28 w-auto flex-shrink-0" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 md:p-4 border border-slate-200">
                <p className="text-xs md:text-sm text-slate-700 font-medium mb-1 md:mb-2 text-center">Credit Score</p>

                <div className="relative w-full max-w-[140px] md:max-w-[200px] mx-auto">
                  <svg viewBox="0 0 200 100" className="w-full">
                    <defs>
                      <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
                        <stop offset="25%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: '#eab308', stopOpacity: 1 }} />
                        <stop offset="75%" style={{ stopColor: '#84cc16', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#22c55e', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>

                    <path
                      d="M 30 90 A 60 60 0 0 1 170 90"
                      fill="none"
                      stroke="url(#gaugeGradient)"
                      strokeWidth="18"
                      strokeLinecap="butt"
                    />

                    <circle cx="100" cy="90" r="40" fill="white" />

                    <line
                      x1="100"
                      y1="90"
                      x2="100"
                      y2="45"
                      stroke="#2c3e50"
                      strokeWidth="3"
                      strokeLinecap="round"
                      transform={`rotate(${needleRotation} 100 90)`}
                    />
                    <circle cx="100" cy="90" r="6" fill="#2c3e50" />
                  </svg>

                  <div className="flex justify-between text-[8px] md:text-[10px] text-slate-600 mt-0.5 px-0 md:px-1">
                    <span>300</span>
                    <span>580</span>
                    <span>670</span>
                    <span>740</span>
                    <span>800</span>
                    <span>850</span>
                  </div>

                  <div className="text-center mt-1 md:mt-2">
                    <p className="text-lg md:text-2xl font-bold" style={{ color: creditScoreInfo.color }}>
                      {review.credit_score || 'N/A'}
                    </p>
                    <p className="text-[9px] md:text-xs font-semibold text-slate-600 mt-0.5">
                      {creditScoreInfo.tier}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 md:mt-8">
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                Credit cards should be paid to $0 each month. Balances over 30% utilization lower your score, and high utilization signals lenders that you're overextended, closing doors to new credit opportunities.
              </p>
            </div>
          </section>

          <section>
            <div className="mb-4 pb-2 border-b-2 border-teal-200">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900">2. Your Current Debt Situation</h2>
            </div>
            <p className="text-xs md:text-base text-slate-600 mb-4">
              Below is a summary of your current unsecured debts based on your credit report.
            </p>

            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full border-collapse text-[9px] md:text-sm">
                  <thead>
                    <tr className="bg-teal-700 text-white">
                      <th className="px-1 py-1.5 md:px-2 md:py-2 text-center font-semibold whitespace-nowrap align-middle">Creditor</th>
                      <th className="px-1 py-1.5 md:px-2 md:py-2 text-center font-semibold whitespace-nowrap align-middle">Balance</th>
                      <th className="px-1 py-1.5 md:px-2 md:py-2 text-center font-semibold whitespace-nowrap align-middle">Min. Pmt</th>
                    </tr>
                  </thead>
                <tbody>
                  {debtItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      <td className="px-1 py-1.5 md:px-2 md:py-2 border-b border-slate-200 font-medium text-slate-900 text-center align-middle">
                        {item.creditor}
                      </td>
                      <td className="px-1 py-1.5 md:px-2 md:py-2 border-b border-slate-200 text-center font-semibold text-slate-900 align-middle">
                        {formatCurrency(item.balance)}
                      </td>
                      <td className="px-1 py-1.5 md:px-2 md:py-2 border-b border-slate-200 text-center text-slate-700 align-middle">
                        {formatCurrency(item.minimum_payment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-teal-50 border-t-2 border-teal-700">
                    <td className="px-1 py-2 md:px-2 md:py-3 font-bold text-red-600 text-center align-middle">
                      TOTAL
                    </td>
                    <td className="px-1 py-2 md:px-2 md:py-3 text-center font-bold text-red-600 align-middle">
                      {formatCurrency(debtItems.reduce((sum, item) => sum + item.balance, 0))}
                    </td>
                    <td className="px-1 py-2 md:px-2 md:py-3 text-center font-bold text-red-600 align-middle">
                      {formatCurrency(debtItems.reduce((sum, item) => sum + item.minimum_payment, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 md:p-4 border border-slate-200 mt-6">
              <p className="text-xs md:text-sm text-slate-700 font-medium mb-3 md:mb-4 text-center">Overall Credit Utilization</p>

              <div className="relative w-full max-w-[400px] md:max-w-[500px] mx-auto px-2">
                <svg viewBox="0 0 500 180" className="w-full" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="excellent" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="good" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#34d399', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="fair" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="poor" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#fb923c', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="veryPoor" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#dc2626', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>

                  <rect x="40" y="115.8" width="50" height="11.2" fill="url(#excellent)" rx="2" />
                  <rect x="105" y="104.6" width="50" height="22.4" fill="url(#good)" rx="2" />
                  <rect x="170" y="93.4" width="50" height="33.6" fill="url(#poor)" rx="2" />
                  <rect x="235" y="82.2" width="50" height="44.8" fill="url(#poor)" rx="2" />
                  <rect x="300" y="71" width="50" height="56" fill="url(#poor)" rx="2" />
                  <rect x="365" y="43" width="50" height="84" fill="url(#veryPoor)" rx="2" />
                  <rect x="430" y="15" width="50" height="112" fill="url(#veryPoor)" rx="2" />

                  {review.overall_credit_utilization !== null && (() => {
                    const utilization = review.overall_credit_utilization;
                    let xPos = 65;
                    let yPos = 115.8;

                    if (utilization <= 10) {
                      xPos = 40 + (utilization / 10) * 50;
                      yPos = 115.8;
                    } else if (utilization <= 20) {
                      xPos = 105 + ((utilization - 10) / 10) * 50;
                      yPos = 104.6;
                    } else if (utilization <= 30) {
                      xPos = 170 + ((utilization - 20) / 10) * 50;
                      yPos = 93.4;
                    } else if (utilization <= 40) {
                      xPos = 235 + ((utilization - 30) / 10) * 50;
                      yPos = 82.2;
                    } else if (utilization <= 50) {
                      xPos = 300 + ((utilization - 40) / 10) * 50;
                      yPos = 71;
                    } else if (utilization <= 75) {
                      xPos = 365 + ((utilization - 50) / 25) * 50;
                      yPos = 43 + ((utilization - 50) / 25) * 28;
                    } else {
                      xPos = 430 + ((utilization - 75) / 25) * 50;
                      yPos = 15 + ((utilization - 75) / 25) * 28;
                    }

                    yPos = yPos - 20;

                    const ballColor = utilizationStatus.color;

                    return (
                      <g>
                        <defs>
                          <radialGradient id="ballGradient" cx="35%" cy="35%">
                            <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 0.8 }} />
                            <stop offset="50%" style={{ stopColor: ballColor, stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: ballColor, stopOpacity: 1 }} />
                          </radialGradient>
                          <filter id="ballShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>
                            <feOffset dx="1" dy="4" result="offsetblur"/>
                            <feComponentTransfer>
                              <feFuncA type="linear" slope="0.5"/>
                            </feComponentTransfer>
                            <feMerge>
                              <feMergeNode/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        <circle
                          cx={xPos}
                          cy={yPos}
                          r="12"
                          fill="url(#ballGradient)"
                          filter="url(#ballShadow)"
                          stroke={ballColor}
                          strokeWidth="1.5"
                          style={{ filter: 'brightness(1.1)' }}
                        />
                      </g>
                    );
                  })()}

                  <text x="65" y="145" fontSize="10" fill="#333333" textAnchor="middle" fontWeight="500">10</text>
                  <text x="130" y="145" fontSize="10" fill="#333333" textAnchor="middle" fontWeight="500">20</text>
                  <text x="195" y="145" fontSize="10" fill="#333333" textAnchor="middle" fontWeight="500">30</text>
                  <text x="260" y="145" fontSize="10" fill="#333333" textAnchor="middle" fontWeight="500">40</text>
                  <text x="325" y="145" fontSize="10" fill="#333333" textAnchor="middle" fontWeight="500">50</text>
                  <text x="390" y="145" fontSize="10" fill="#333333" textAnchor="middle" fontWeight="500">75</text>
                  <text x="455" y="145" fontSize="10" fill="#333333" textAnchor="middle" fontWeight="500">100</text>

                  <line x1="40" y1="130" x2="480" y2="130" stroke="#ffffff" strokeWidth="1" />
                </svg>

                <div className="text-center mt-3 md:mt-4">
                  <p className="text-lg md:text-2xl font-bold" style={{ color: utilizationStatus.color }}>
                    {formatPercent(review.overall_credit_utilization)}
                  </p>
                  <p className="text-[9px] md:text-xs font-semibold text-slate-600 mt-0.5">
                    {utilizationStatus.label}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 pb-2 border-b-2 border-teal-200">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900">3. Comparing your Options</h2>
            </div>

            <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-xl p-4 md:p-6 mb-4 md:mb-6 border-2 border-red-400 shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none"></div>

              <div className="absolute top-0 right-0 w-24 h-24 bg-red-400/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-28 h-28 bg-red-400/20 rounded-full blur-2xl"></div>

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-red-200 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <p className="text-xs md:text-sm font-bold text-white uppercase tracking-wide">Total Debt</p>
                  </div>
                  <p className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">
                    {formatCurrency(totalDebt)}
                  </p>
                </div>

                <div className="hidden md:flex items-center justify-center flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 rounded-full blur-lg animate-pulse"></div>
                    <div className="relative bg-white rounded-full p-3 shadow-xl">
                      <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="md:hidden flex items-center justify-center flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse"></div>
                    <div className="relative bg-white rounded-full p-2 shadow-lg">
                      <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-2 bg-gradient-to-r from-slate-700 to-slate-600 border-b-2 border-slate-800">
                <div className="p-2 md:p-4 text-center">
                  <p className="font-bold text-white text-[10px] md:text-sm">Current Payments</p>
                </div>
                <div className="p-2 md:p-4 text-center border-l border-green-400 bg-gradient-to-r from-green-600 to-green-500">
                  <p className="font-bold text-white text-[10px] md:text-sm">Resolution Program</p>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-2 hover:bg-blue-50 transition-colors">
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center border-r border-slate-200 bg-slate-50">
                    <p className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Monthly Payment</p>
                    <p className="text-sm md:text-xl font-black text-red-600">
                      {formatCurrency(debtItems.reduce((sum, item) => sum + (item.minimum_payment || 0), 0))}
                    </p>
                  </div>
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center bg-green-50">
                    <p className="text-xs md:text-sm font-semibold text-green-700 mb-2">Monthly Payment</p>
                    <p className="text-sm md:text-xl font-black text-green-900">{formatCurrency(calculateProgramMonthlyPayment())}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 hover:bg-blue-50 transition-colors">
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center border-r border-slate-200 bg-slate-50">
                    <p className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Monthly Savings</p>
                    <p className="text-sm md:text-xl font-black text-red-600">{formatCurrency(0)}</p>
                  </div>
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center bg-green-50">
                    <p className="text-xs md:text-sm font-semibold text-green-700 mb-2">Monthly Savings</p>
                    <p className="text-sm md:text-xl font-black text-green-900">
                      {formatCurrency(
                        debtItems.reduce((sum, item) => sum + (item.minimum_payment || 0), 0) -
                        (calculateProgramMonthlyPayment() || 0)
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 hover:bg-blue-50 transition-colors">
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center border-r border-slate-200 bg-slate-50">
                    <p className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Estimated Term</p>
                    <p className="text-sm md:text-xl font-black text-red-600">{addMonthsToTerm(review.own_estimated_term, 30)}</p>
                  </div>
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center bg-green-50">
                    <p className="text-xs md:text-sm font-semibold text-green-700 mb-2">Estimated Term</p>
                    <p className="text-sm md:text-xl font-black text-green-900">{convertYearsToMonths(review.program_estimated_term)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 hover:bg-orange-50 transition-colors">
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center border-r border-slate-200 bg-slate-50">
                    <p className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Interest</p>
                    <p className="text-xs md:text-xl font-black text-red-600">
                      {formatCurrency(
                        (calculateAdjustedPayoff(review.own_estimated_term, review.own_estimated_total_payoff, 30) || 0) - totalDebt
                      )}
                    </p>
                  </div>
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center bg-green-50">
                    <p className="text-xs md:text-sm font-semibold text-green-700 mb-2">Interest</p>
                    <p className="text-xs md:text-xl font-black text-green-900">
                      {formatCurrency(0)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 hover:bg-purple-50 transition-colors">
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center border-r border-slate-200 bg-slate-50">
                    <p className="text-xs md:text-sm font-semibold text-slate-600 mb-2">Total Cost</p>
                    <p className="text-sm md:text-xl font-black text-red-600">
                      {formatCurrency(calculateAdjustedPayoff(review.own_estimated_term, review.own_estimated_total_payoff, 30))}
                    </p>
                  </div>
                  <div className="p-2 md:p-4 flex flex-col items-center justify-center bg-green-50">
                    <p className="text-xs md:text-sm font-semibold text-green-700 mb-2">Total Cost</p>
                    <p className="text-sm md:text-xl font-black text-green-900">
                      {formatCurrency(review.program_estimated_total_payoff ?? totalDebt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 rounded-xl p-4 md:p-6 mt-4 md:mt-6 border-2 border-green-400 shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none"></div>

              <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-28 h-28 bg-emerald-400/20 rounded-full blur-2xl"></div>

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-green-200 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    <p className="text-xs md:text-sm font-bold text-white uppercase tracking-wide">Potential Savings</p>
                  </div>
                  <p className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">
                    {formatCurrency(calculateAdjustedSavings())}
                  </p>
                </div>

                <div className="hidden md:flex items-center justify-center flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 rounded-full blur-lg animate-pulse"></div>
                    <div className="relative bg-white rounded-full p-3 shadow-xl">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="md:hidden flex items-center justify-center flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse"></div>
                    <div className="relative bg-white rounded-full p-2 shadow-lg">
                      <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-6 md:p-8 text-white">
              <h2 className="text-xl md:text-3xl font-bold mb-6 md:mb-8">4. How to Get Started</h2>

              <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white text-teal-700 flex items-center justify-center font-bold text-lg md:text-xl">
                    1
                  </div>
                  <p className="text-base md:text-xl">Start and enroll in the program</p>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white text-teal-700 flex items-center justify-center font-bold text-lg md:text-xl">
                    2
                  </div>
                  <p className="text-base md:text-xl">Save monthly into your escrow account</p>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white text-teal-700 flex items-center justify-center font-bold text-lg md:text-xl">
                    3
                  </div>
                  <p className="text-base md:text-xl">Pay off enrolled debts and complete the program</p>
                </div>
              </div>

              <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-teal-500/50">
                <p className="text-base md:text-xl mb-4 md:mb-6 text-center">This program is powered by</p>

                <div className="flex justify-center mb-6 md:mb-8">
                  <div className="bg-white rounded-lg px-6 md:px-10 py-3 md:py-4">
                    <img src={firstChoiceLogo} alt="First Choice Debt Relief" className="h-10 md:h-14 w-auto" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 md:gap-x-16 gap-y-5 md:gap-y-6 mb-6 md:mb-8 max-w-xl mx-auto">
                  <div className="text-center">
                    <p className="text-xl md:text-3xl font-bold">18 Years</p>
                    <p className="text-xs md:text-base text-teal-100">In Business</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl md:text-3xl font-bold">A+ Rated</p>
                    <p className="text-xs md:text-base text-teal-100">BBB Accredited</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl md:text-3xl font-bold">No Upfront</p>
                    <p className="text-xs md:text-base text-teal-100">Fees</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl md:text-3xl font-bold">Since 2012</p>
                    <p className="text-xs md:text-base text-teal-100">BBB Accredited</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 pt-4 md:pt-6">
                  <a
                    href="https://uk.trustpilot.com/review/firstchoicedebtrelief.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative bg-gradient-to-br from-white to-slate-50 rounded-xl p-2 md:p-3 flex items-center justify-center h-14 md:h-16 shadow-lg border border-white/20 backdrop-blur-sm overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-200"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-green-600 text-green-600" />
                        ))}
                      </div>
                      <p className="text-[10px] md:text-xs text-slate-700 font-bold">Trustpilot</p>
                      <p className="text-[8px] md:text-[10px] text-slate-600">4.9 | 835 reviews</p>
                    </div>
                  </a>
                  <a
                    href="https://www.bbb.org/us/ca/santa-ana/profile/debt-relief-services/first-choice-debt-relief-inc-1126-172003710/addressId/410226"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative bg-gradient-to-br from-white to-slate-50 rounded-xl p-2 md:p-3 flex items-center justify-center h-14 md:h-16 shadow-lg border border-white/20 backdrop-blur-sm overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-200"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <img src={bbbLogo} alt="BBB A+ Rating" className="relative h-10 md:h-12 w-auto z-10" />
                  </a>
                  <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-xl p-2 md:p-3 flex items-center justify-center h-14 md:h-16 shadow-lg border border-white/20 backdrop-blur-sm overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <img src={acdrLogo} alt="ACDR" className="relative h-10 md:h-12 w-auto z-10" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
