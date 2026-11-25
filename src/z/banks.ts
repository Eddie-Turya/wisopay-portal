/** Banks WisoPay can pay out to (Snippe bank codes). Keep in step with the backend's SNIPPE_BANKS. */
export const BANKS: { code: string; name: string }[] = [
  ['ABSA', 'ABSA Bank Tanzania'], ['ACCESS', 'Access Bank Tanzania'], ['AKIBA', 'Akiba Commercial Bank'], ['AMANA', 'Amana Bank'],
  ['AZANIA', 'Azania Bank'], ['BANCABC', 'BancABC (African Banking Corporation)'], ['BARODA', 'Bank of Baroda'], ['BOA', 'Bank of Africa Tanzania'],
  ['BOI', 'Bank of India'], ['CANARA', 'Canara Bank'], ['CITI', 'Citibank Tanzania'], ['CRDB', 'CRDB Bank'], ['DASHENG', 'China Dasheng Bank'],
  ['DCB', 'DCB Commercial Bank'], ['DTB', 'Diamond Trust Bank'], ['ECOBANK', 'Ecobank Tanzania'], ['EQUITY', 'Equity Bank Tanzania'],
  ['EXIM', 'Exim Bank'], ['FNB', 'First National Bank'], ['GT BANK', 'Guaranty Trust Bank'], ['HABIB', 'Habib African Bank'],
  ['ICB', 'International Commercial Bank'], ['IMBANK', 'I&M Bank'], ['KCB', 'KCB Bank Tanzania'], ['KILIMANJARO', 'Kilimanjaro Co-operative Bank'],
  ['MAENDELEO', 'Maendeleo Bank'], ['MKOMBOZI', 'Mkombozi Commercial Bank'], ['MWALIMU', 'Mwalimu Commercial Bank'], ['MWANGA', 'Mwanga Hakika Bank'],
  ['NBC', 'NBC (National Bank of Commerce)'], ['NCBA', 'NCBA Bank'], ['NMB', 'NMB Bank'], ['PBZ', "People's Bank of Zanzibar"],
  ['SCB', 'Standard Chartered'], ['SELCOMPESA', 'Selcom Pesa'], ['STANBIC', 'Stanbic Bank'], ['TCB', 'Tanzania Commercial Bank'],
  ['UBA', 'United Bank for Africa'], ['UCHUMI', 'Uchumi Commercial Bank'], ['YETU', 'Yetu Microfinance Bank'],
].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
export const bankName = (code?: string | null) => BANKS.find((b) => b.code === code)?.name ?? code ?? 'Bank';
