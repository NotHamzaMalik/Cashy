# Cashiro → Cashy design audit

Reference repository: https://github.com/ritesh-kanwar/Cashiro

Local reference revision: `40a387fd0bb87bdc51c80124e0fbf084e8a2b2ce` (inspected 13 October 2026). The reference checkout was not edited.

| Observed reference | Web translation |
| --- | --- |
| screenshots/home.png: stacked account cards, recent rows, warm dark theme | Responsive dashboard; account cards retain rounded hierarchy; recent ledger beside budget/family summaries |
| screenshots/analytics.png: period chips, large total, peach line chart | Reusable range selector, summary card, accessible SVG/chart table equivalents |
| Color.kt: semantic income/expense/transfer/investment colors and warm palette variants | CSS design tokens, semantically colored amounts with accompanying type labels |
| Type.kt: SN Pro family with rounded typography and Material hierarchy | Rounded system font stack initially; packaged font only after license verification |
| BudgetCard.kt: 800 ms progress tween, overspend/80% status and rounded gradient surface | Progress card with CSS transition, actual percentage text and reduced-motion override |
| CashiroBottomNavigation.kt: floating tonal pills, blur and animated selection | Fixed mobile glass navigation; desktop sidebar; safe-area padding |
| HomeScreen.kt: reusable summary/account/subscription widgets and shared transitions | Composable React cards, responsive grids and short nonblocking entry transitions |

Cashy's additions use the same visual system: income, goals, investments, family report review, PDF review and AI consent. Desktop layouts use available width rather than stretching a phone screenshot. Avoid copying third-party bank logos, avatars, illustration backgrounds or fonts without verified terms. Initial implementation uses custom CSS motifs and Lucide icons.

Cashiro is AGPL-3.0. A web rewrite cannot directly execute Compose components. Treat adapted components/design as reference-derived work, preserve attribution, and carry the license/source-availability review into release. Never describe Cashy as local-only or on-device AI when cloud services are enabled.
