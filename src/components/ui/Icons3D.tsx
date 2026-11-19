import React from "react";

interface Icon3DProps {
  className?: string;
  active?: boolean;
}

/**
 * 1. Home3D: أيقونة بيت ثلاثية الأبعاد بلمعة فاخرة وتدرجات ذهبية/برونزية
 */
export function Home3D({ className = "w-6 h-6", active = false }: Icon3DProps) {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 ${active ? "scale-105" : ""}`}
    >
      <defs>
        <filter id={`shadow-home-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#B45309" floodOpacity={active ? "0.4" : "0.2"} />
        </filter>
        <linearGradient id={`roof-grad-${id}`} x1="8" y1="6" x2="40" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={`roof-side-${id}`} x1="24" y1="8" x2="42" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <linearGradient id={`base-grad-${id}`} x1="12" y1="18" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? "#FFFBEB" : "#F8FAFC"} />
          <stop offset="60%" stopColor={active ? "#FEF3C7" : "#E2E8F0"} />
          <stop offset="100%" stopColor={active ? "#FDE68A" : "#CBD5E1"} />
        </linearGradient>
        <linearGradient id={`door-grad-${id}`} x1="20" y1="28" x2="28" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>

      <g filter={`url(#shadow-home-${id})`}>
        {/* القاعدة الرئيسية للبيت */}
        <path
          d="M12 21L24 11L36 21V41C36 42.6569 34.6569 44 33 44H15C13.3431 44 12 42.6569 12 41V21Z"
          fill={`url(#base-grad-${id})`}
        />
        {/* الواجهة الجانبية للعمق 3D */}
        <path
          d="M32 21L24 14V44H33C34.6569 44 36 42.6569 36 41V21H32Z"
          fill="#000"
          fillOpacity="0.08"
        />

        {/* السقف ثلاثي الأبعاد المائل */}
        <path
          d="M24 6L6 21.5C5.17157 22.21 5.68629 23.5 6.77258 23.5H10L24 11.5L38 23.5H41.2274C42.3137 23.5 42.8284 22.21 42 21.5L24 6Z"
          fill={`url(#roof-grad-${id})`}
        />
        {/* لمعة زجاجية علوية على السقف */}
        <path
          d="M24 7.5L10 19.5H13L24 10L35 19.5H38L24 7.5Z"
          fill="#FFF"
          fillOpacity="0.45"
        />

        {/* الباب مع قوس مقوس ولمعة */}
        <path
          d="M20 28C20 25.7909 21.7909 24 24 24C26.2091 24 28 25.7909 28 28V44H20V28Z"
          fill={`url(#door-grad-${id})`}
        />
        <circle cx="26.5" cy="34.5" r="1" fill="#FEF3C7" />

        {/* نافذة علوية دائرية صغيرة */}
        <circle cx="24" cy="18" r="3" fill="#F59E0B" fillOpacity="0.3" stroke="#D97706" strokeWidth="1" />
        <path d="M24 15V21M21 18H27" stroke="#FFF" strokeWidth="0.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * 2. Explore3D: أيقونة بوصلة وعدسة استكشاف ثلاثية الأبعاد مع إطار معدني مصقول
 */
export function Explore3D({ className = "w-6 h-6", active = false }: Icon3DProps) {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 ${active ? "scale-105" : ""}`}
    >
      <defs>
        <filter id={`shadow-exp-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#B45309" floodOpacity={active ? "0.4" : "0.2"} />
        </filter>
        <linearGradient id={`bezel-grad-${id}`} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="80%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <radialGradient id={`dial-grad-${id}`} cx="24" cy="24" r="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? "#FEF3C7" : "#FFFFFF"} />
          <stop offset="70%" stopColor={active ? "#FDE68A" : "#F1F5F9"} />
          <stop offset="100%" stopColor={active ? "#F59E0B" : "#CBD5E1"} />
        </radialGradient>
        <linearGradient id={`needle-north-${id}`} x1="24" y1="10" x2="28" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id={`needle-south-${id}`} x1="24" y1="38" x2="20" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      <g filter={`url(#shadow-exp-${id})`}>
        {/* الحلقة الخارجية المعدنية 3D */}
        <circle cx="24" cy="24" r="19" fill={`url(#bezel-grad-${id})`} />
        <circle cx="24" cy="24" r="16.5" fill="#000" fillOpacity="0.15" />
        
        {/* قرص المينا الداخلي */}
        <circle cx="24" cy="24" r="15" fill={`url(#dial-grad-${id})`} />

        {/* علامات الاتجاهات الأربعة */}
        <circle cx="24" cy="11.5" r="1.2" fill="#D97706" />
        <circle cx="36.5" cy="24" r="1.2" fill="#D97706" />
        <circle cx="24" cy="36.5" r="1.2" fill="#D97706" />
        <circle cx="11.5" cy="24" r="1.2" fill="#D97706" />

        {/* عقرب البوصلة الثلاثي الأبعاد */}
        {/* الشمال (الأحمر) */}
        <path d="M24 10L27.5 24H24L24 10Z" fill={`url(#needle-north-${id})`} />
        <path d="M24 10L20.5 24H24L24 10Z" fill="#F87171" />
        {/* الجنوب (الفضي الداكن) */}
        <path d="M24 38L20.5 24H24L24 38Z" fill={`url(#needle-south-${id})`} />
        <path d="M24 38L27.5 24H24L24 38Z" fill="#94A3B8" />

        {/* مركز العقرب الزجاجي */}
        <circle cx="24" cy="24" r="3" fill="#D97706" />
        <circle cx="23.5" cy="23.5" r="1.2" fill="#FEF3C7" />

        {/* لمعة زجاجية علوية دائرية (Glossy Specular) */}
        <path
          d="M12 18C14 13 18 10 24 10C30 10 34 13 36 18C33 13 28 11.5 24 11.5C20 11.5 15 13 12 18Z"
          fill="#FFF"
          fillOpacity="0.5"
        />
      </g>
    </svg>
  );
}

/**
 * 3. Bookings3D: أيقونة تقويم وتذكرة حجز ثلاثية الأبعاد مع حلقات ذهبية
 */
export function Bookings3D({ className = "w-6 h-6", active = false }: Icon3DProps) {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 ${active ? "scale-105" : ""}`}
    >
      <defs>
        <filter id={`shadow-book-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#B45309" floodOpacity={active ? "0.4" : "0.2"} />
        </filter>
        <linearGradient id={`cal-body-${id}`} x1="8" y1="12" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? "#FFFBEB" : "#FFFFFF"} />
          <stop offset="70%" stopColor={active ? "#FEF3C7" : "#F8FAFC"} />
          <stop offset="100%" stopColor={active ? "#FDE68A" : "#E2E8F0"} />
        </linearGradient>
        <linearGradient id={`cal-header-${id}`} x1="8" y1="10" x2="40" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={`ring-grad-${id}`} x1="14" y1="4" x2="18" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>

      <g filter={`url(#shadow-book-${id})`}>
        {/* خلفية التقويم البيضاء البارزة */}
        <rect x="8" y="12" width="32" height="30" rx="6" fill={`url(#cal-body-${id})`} />
        {/* ظل العمق الجانبي والسفلي */}
        <path d="M34 12H40V36C40 39.3137 37.3137 42 34 42H14L34 12Z" fill="#000" fillOpacity="0.04" />

        {/* الترويسة الذهبية العلوية */}
        <path d="M8 18C8 14.6863 10.6863 12 14 12H34C37.3137 12 40 14.6863 40 18V21H8V18Z" fill={`url(#cal-header-${id})`} />
        {/* لمعة الترويسة */}
        <path d="M8 15C8 13.3431 9.34315 12 11 12H37C38.6569 12 40 13.3431 40 15V16H8V15Z" fill="#FFF" fillOpacity="0.35" />

        {/* الحلقات المعدنية العلوية 3D */}
        <rect x="14" y="6" width="4" height="10" rx="2" fill={`url(#ring-grad-${id})`} />
        <rect x="30" y="6" width="4" height="10" rx="2" fill={`url(#ring-grad-${id})`} />

        {/* علامة التأكيد أو التاريخ (Checkmark 3D) */}
        <circle cx="24" cy="30" r="7" fill={active ? "#F59E0B" : "#F1F5F9"} stroke={active ? "#D97706" : "#CBD5E1"} strokeWidth="1.5" />
        <path
          d="M21 30L23 32L27 28"
          stroke={active ? "#FFF" : "#64748B"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* شبكة الأيام المبسطة */}
        <circle cx="14" cy="27" r="1.5" fill="#CBD5E1" />
        <circle cx="14" cy="33" r="1.5" fill="#CBD5E1" />
        <circle cx="34" cy="27" r="1.5" fill="#CBD5E1" />
        <circle cx="34" cy="33" r="1.5" fill="#CBD5E1" />
      </g>
    </svg>
  );
}

/**
 * 4. Account3D: أيقونة درع وملف شخصي ثلاثية الأبعاد بلمعة فاخرة
 */
export function Account3D({ className = "w-6 h-6", active = false }: Icon3DProps) {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 ${active ? "scale-105" : ""}`}
    >
      <defs>
        <filter id={`shadow-acc-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#B45309" floodOpacity={active ? "0.4" : "0.2"} />
        </filter>
        <linearGradient id={`shield-border-${id}`} x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <radialGradient id={`shield-inner-${id}`} cx="24" cy="20" r="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? "#FFFBEB" : "#FFFFFF"} />
          <stop offset="70%" stopColor={active ? "#FEF3C7" : "#F1F5F9"} />
          <stop offset="100%" stopColor={active ? "#FDE68A" : "#CBD5E1"} />
        </radialGradient>
        <linearGradient id={`user-grad-${id}`} x1="16" y1="12" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      <g filter={`url(#shadow-acc-${id})`}>
        {/* الدرع الخلفي ثلاثي الأبعاد */}
        <path
          d="M24 6L38 11V23C38 32.5 32 39 24 43C16 39 10 32.5 10 23V11L24 6Z"
          fill={`url(#shield-border-${id})`}
        />
        {/* القلب الداخلي للدرع */}
        <path
          d="M24 8.5L35.5 12.8V22.5C35.5 30.5 30.5 36.2 24 39.8C17.5 36.2 12.5 30.5 12.5 22.5V12.8L24 8.5Z"
          fill={`url(#shield-inner-${id})`}
        />

        {/* رأس المستخدم ثلاثي الأبعاد مع لمعة كروية */}
        <circle cx="24" cy="18" r="5" fill={`url(#user-grad-${id})`} />
        <ellipse cx="23" cy="16.5" rx="2" ry="1.2" fill="#FFF" fillOpacity="0.45" />

        {/* أكتاف وجسم المستخدم */}
        <path
          d="M17 33C17 29 20 26 24 26C28 26 31 29 31 33C31 34 30.5 34.5 29.5 35C27.5 36 25.5 36.5 24 36.5C22.5 36.5 20.5 36 18.5 35C17.5 34.5 17 34 17 33Z"
          fill={`url(#user-grad-${id})`}
        />
        <path
          d="M20 28C22 27 26 27 28 28"
          stroke="#FFF"
          strokeWidth="1"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />

        {/* لمعة الدرع العلوية */}
        <path
          d="M24 9L34 13V18C34 15 30 11 24 9Z"
          fill="#FFF"
          fillOpacity="0.45"
        />
      </g>
    </svg>
  );
}

/**
 * 5. Bell3D: جرس التنبيهات ثلاثي الأبعاد بلون ذهبي ولمعة براقة ونقطة تنبيهية
 */
export function Bell3D({ className = "w-5 h-5", hasNotification = true }: { className?: string; hasNotification?: boolean }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id={`shadow-bell-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#B45309" floodOpacity="0.3" />
        </filter>
        <linearGradient id={`bell-body-${id}`} x1="8" y1="8" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="85%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <radialGradient id={`red-dot-${id}`} cx="29" cy="8" r="5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="60%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </radialGradient>
      </defs>

      <g filter={`url(#shadow-bell-${id})`}>
        {/* الحلقة العلوية للجرس */}
        <path d="M18 7C18 5.89543 18.8954 5 20 5C21.1046 5 22 5.89543 22 7V9H18V7Z" fill="#D97706" />

        {/* جسم الجرس ثلاثي الأبعاد */}
        <path
          d="M20 9C14.4772 9 12 14 12 21C12 24 10 26 8 28C7.5 28.5 7.8 29.5 8.6 29.5H31.4C32.2 29.5 32.5 28.5 32 28C30 26 28 24 28 21C28 14 25.5228 9 20 9Z"
          fill={`url(#bell-body-${id})`}
        />
        {/* حافة الجرس السفلية الممتدة */}
        <ellipse cx="20" cy="29.5" rx="12" ry="2" fill="#B45309" />
        <ellipse cx="20" cy="29" rx="11" ry="1.5" fill="#FDE68A" fillOpacity="0.4" />

        {/* لسان الجرس السفلي */}
        <circle cx="20" cy="33" r="3" fill="#D97706" />
        <circle cx="19" cy="32" r="1" fill="#FEF3C7" />

        {/* لمعة جانبية عاكسة */}
        <path
          d="M15 15C15 12 17 10 20 10C18 11 16 13 16 17C16 21 14 24 13 26C13.5 24 15 20 15 15Z"
          fill="#FFF"
          fillOpacity="0.5"
        />

        {/* نقطة الإشعار الحمراء البارزة */}
        {hasNotification && (
          <g>
            <circle cx="29" cy="8" r="4.5" fill={`url(#red-dot-${id})`} stroke="#FFF" strokeWidth="1.5" />
            <circle cx="27.5" cy="6.5" r="1" fill="#FFF" fillOpacity="0.8" />
          </g>
        )}
      </g>
    </svg>
  );
}

/**
 * 6. Moon3D: هلال سماوي ثلاثي الأبعاد مع نجوم متلألئة للوضع الليلي
 */
export function Moon3D({ className = "w-5 h-5" }: { className?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id={`shadow-moon-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#6366F1" floodOpacity="0.3" />
        </filter>
        <linearGradient id={`moon-grad-${id}`} x1="8" y1="6" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EEF2FF" />
          <stop offset="35%" stopColor="#C7D2FE" />
          <stop offset="70%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>

      <g filter={`url(#shadow-moon-${id})`}>
        {/* جسم الهلال المضيء ثلاثي الأبعاد */}
        <path
          d="M26.5 8C20 8.5 14 14 14 21.5C14 29 20 34.5 27 34C19 33 11 26 11 19C11 12 17 8.5 26.5 8Z"
          fill={`url(#moon-grad-${id})`}
        />
        {/* لمعة حافة الهلال المقوسة */}
        <path
          d="M26 9.5C19.5 10.5 13.5 16 13.5 22.5C13.5 25 15 28 17 30C13 26 13 18 19 12C21 10.5 23.5 9.8 26 9.5Z"
          fill="#FFF"
          fillOpacity="0.6"
        />

        {/* نجمة متلألئة علوية */}
        <path d="M29 11L30 8L31 11L34 12L31 13L30 16L29 13L26 12L29 11Z" fill="#FDE68A" />
        {/* نجمة متلألئة سفلية */}
        <path d="M30 24L30.7 22L31.4 24L33.4 24.7L31.4 25.4L30.7 27.4L30 25.4L28 24.7L30 24Z" fill="#FDE68A" fillOpacity="0.8" />
      </g>
    </svg>
  );
}

/**
 * 7. Sun3D: شمس ذهبية مشعة ثلاثية الأبعاد للوضع النهاري
 */
export function Sun3D({ className = "w-5 h-5" }: { className?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id={`shadow-sun-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.4" />
        </filter>
        <radialGradient id={`sun-ball-${id}`} cx="18" cy="18" r="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="90%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </radialGradient>
        <linearGradient id={`ray-grad-${id}`} x1="0" y1="0" x2="0" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      <g filter={`url(#shadow-sun-${id})`}>
        {/* الأشعة الثلاثية الأبعاد */}
        <rect x="18.5" y="3" width="3" height="6" rx="1.5" fill={`url(#ray-grad-${id})`} />
        <rect x="18.5" y="31" width="3" height="6" rx="1.5" fill={`url(#ray-grad-${id})`} />
        <rect x="3" y="18.5" width="6" height="3" rx="1.5" fill={`url(#ray-grad-${id})`} />
        <rect x="31" y="18.5" width="6" height="3" rx="1.5" fill={`url(#ray-grad-${id})`} />
        
        {/* أشعة مائلة */}
        <rect x="8.5" y="7.5" width="3" height="5" rx="1.5" transform="rotate(-45 8.5 7.5)" fill={`url(#ray-grad-${id})`} />
        <rect x="29.5" y="27.5" width="3" height="5" rx="1.5" transform="rotate(-45 29.5 27.5)" fill={`url(#ray-grad-${id})`} />
        <rect x="27.5" y="8.5" width="5" height="3" rx="1.5" transform="rotate(-45 27.5 8.5)" fill={`url(#ray-grad-${id})`} />
        <rect x="7.5" y="29.5" width="5" height="3" rx="1.5" transform="rotate(-45 7.5 29.5)" fill={`url(#ray-grad-${id})`} />

        {/* الكرة الشمسية ثلاثية الأبعاد */}
        <circle cx="20" cy="20" r="9" fill={`url(#sun-ball-${id})`} />
        {/* لمعة السطح الزجاجية */}
        <ellipse cx="17" cy="16" rx="4" ry="2.5" fill="#FFF" fillOpacity="0.6" transform="rotate(-30 17 16)" />
      </g>
    </svg>
  );
}

/**
 * 8. Heart3D: قلب ياقوتي أحمر ثلاثي الأبعاد بلمعة زجاجية
 */
export function Heart3D({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id={`shadow-heart-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor={active ? "#E11D48" : "#64748B"} floodOpacity={active ? "0.45" : "0.2"} />
        </filter>
        <linearGradient id={`heart-active-${id}`} x1="8" y1="8" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="35%" stopColor="#F43F5E" />
          <stop offset="80%" stopColor="#BE123C" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
        <linearGradient id={`heart-inactive-${id}`} x1="8" y1="8" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>

      <g filter={`url(#shadow-heart-${id})`}>
        {/* جسم القلب البارز ثلاثي الأبعاد */}
        <path
          d="M20 33C20 33 6 24 6 15C6 10.5 9.5 7 14 7C16.8 7 19.2 8.5 20 10.5C20.8 8.5 23.2 7 26 7C30.5 7 34 10.5 34 15C34 24 20 33 20 33Z"
          fill={active ? `url(#heart-active-${id})` : `url(#heart-inactive-${id})`}
        />
        {/* لمعة السطح العلوية اليسرى */}
        <path
          d="M13 10C10.5 10 9 12 9 14.5C9 16 10 18 11.5 19.5C12 18 13.5 16 15 15C16.5 14 15 11 13 10Z"
          fill="#FFF"
          fillOpacity={active ? "0.6" : "0.4"}
        />
      </g>
    </svg>
  );
}

/**
 * 9. Pin3D: دبوس موقع جغرافي ثلاثي الأبعاد بلمعة فاخرة
 */
export function Pin3D({ className = "w-4 h-4" }: { className?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id={`shadow-pin-${id}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#B45309" floodOpacity="0.3" />
        </filter>
        <linearGradient id={`pin-head-${id}`} x1="8" y1="4" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="85%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>

      <g filter={`url(#shadow-pin-${id})`}>
        {/* جسم الدبوس المقوس 3D */}
        <path
          d="M18 4C11.9249 4 7 8.92487 7 15C7 22.5 18 32 18 32C18 32 29 22.5 29 15C29 8.92487 24.0751 4 18 4Z"
          fill={`url(#pin-head-${id})`}
        />
        {/* العين الداخلية للدبوس */}
        <circle cx="18" cy="14" r="4.5" fill="#FFF" />
        <circle cx="18" cy="14" r="3" fill="#D97706" />

        {/* لمعة زجاجية علوية */}
        <path
          d="M13 8C15 6 18 5.5 21 6C18 6.5 15.5 8 14 11C13.5 10 13 9 13 8Z"
          fill="#FFF"
          fillOpacity="0.6"
        />
      </g>
    </svg>
  );
}

/**
 * 10. Wedding3D: أيقونة قاعات أفراح ومناسبات ثلاثية الأبعاد (تاج / قصر)
 */
export function Wedding3D({ className = "w-5 h-5" }: { className?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={`crown-grad-${id}`} x1="4" y1="8" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <path
        d="M6 26L8 12L14 18L18 9L22 18L28 12L30 26C30 27.1046 29.1046 28 28 28H8C6.89543 28 6 27.1046 6 26Z"
        fill={`url(#crown-grad-${id})`}
      />
      <circle cx="18" cy="8" r="2" fill="#FDE68A" />
      <circle cx="8" cy="11" r="1.5" fill="#FDE68A" />
      <circle cx="28" cy="11" r="1.5" fill="#FDE68A" />
      <path d="M8 24H28V26H8V24Z" fill="#FFF" fillOpacity="0.4" />
    </svg>
  );
}

/**
 * 11. Chalet3D: أيقونة شاليهات واستراحات ترفيهية ثلاثية الأبعاد (مظلة وشاطئ/مسبح)
 */
export function Chalet3D({ className = "w-5 h-5" }: { className?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={`chalet-grad-${id}`} x1="6" y1="8" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>
      <path
        d="M18 6C11 6 7 12 7 16H29C29 12 25 6 18 6Z"
        fill={`url(#chalet-grad-${id})`}
      />
      <path d="M12 6C14 9 14 13 14 16H18C18 13 18 9 18 6Z" fill="#FDE68A" />
      <path d="M22 6C20 9 20 13 20 16H24C24 13 22 9 22 6Z" fill="#FDE68A" />
      <path d="M17 16V29C17 29.5 17.5 30 18 30C18.5 30 19 29.5 19 29V16H17Z" fill="#D97706" />
      <ellipse cx="18" cy="29" rx="8" ry="2" fill="#38BDF8" fillOpacity="0.4" />
    </svg>
  );
}

/**
 * 12. Calendar3D: أيقونة التقويم والمواعيد ثلاثية الأبعاد
 */
export function Calendar3D({ className = "w-6 h-6", active = false }: Icon3DProps) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={`cal-body-${id}`} x1="4" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? "#F59E0B" : "#F1F5F9"} />
          <stop offset="100%" stopColor={active ? "#D97706" : "#CBD5E1"} />
        </linearGradient>
        <linearGradient id={`cal-header-${id}`} x1="4" y1="6" x2="32" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? "#FBBF24" : "#E2E8F0"} />
          <stop offset="100%" stopColor={active ? "#F59E0B" : "#94A3B8"} />
        </linearGradient>
      </defs>
      {/* Calendar base plate with shadow */}
      <rect x="5" y="8" width="26" height="23" rx="6" fill={`url(#cal-body-${id})`} />
      {/* Calendar top bar */}
      <rect x="5" y="8" width="26" height="8" rx="6" fill={`url(#cal-header-${id})`} />
      {/* Binder rings */}
      <rect x="10" y="5" width="3" height="6" rx="1.5" fill={active ? "#B45309" : "#64748B"} />
      <rect x="23" y="5" width="3" height="6" rx="1.5" fill={active ? "#B45309" : "#64748B"} />
      {/* Grid dots */}
      <circle cx="11" cy="20" r="1.5" fill={active ? "#78350F" : "#64748B"} />
      <circle cx="18" cy="20" r="1.5" fill={active ? "#78350F" : "#64748B"} />
      <circle cx="25" cy="20" r="1.5" fill={active ? "#78350F" : "#64748B"} />
      <circle cx="11" cy="25" r="1.5" fill={active ? "#78350F" : "#64748B"} />
      <circle cx="18" cy="25" r="1.5" fill={active ? "#78350F" : "#64748B"} />
      <circle cx="25" cy="25" r="1.5" fill={active ? "#78350F" : "#64748B"} />
    </svg>
  );
}

/**
 * 13. Venues3D: أيقونة القاعات والمنشآت ثلاثية الأبعاد
 */
export function Venues3D({ className = "w-6 h-6", active = false }: Icon3DProps) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={`ven-body-${id}`} x1="6" y1="10" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? "#F59E0B" : "#F8FAFC"} />
          <stop offset="100%" stopColor={active ? "#B45309" : "#94A3B8"} />
        </linearGradient>
      </defs>
      {/* Pillars and Hall building */}
      <path
        d="M6 14L18 6L30 14V30H6V14Z"
        fill={`url(#ven-body-${id})`}
      />
      {/* Entrance arch */}
      <path
        d="M14 30V20C14 17.8 15.8 16 18 16C20.2 16 22 17.8 22 20V30H14Z"
        fill={active ? "#78350F" : "#475569"}
      />
      {/* Columns */}
      <rect x="9" y="16" width="2.5" height="12" rx="1" fill={active ? "#FDE68A" : "#CBD5E1"} />
      <rect x="24.5" y="16" width="2.5" height="12" rx="1" fill={active ? "#FDE68A" : "#CBD5E1"} />
    </svg>
  );
}
