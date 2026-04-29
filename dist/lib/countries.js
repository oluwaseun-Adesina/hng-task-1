export const ISO_TO_NAME = {
    AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AO: 'Angola', AR: 'Argentina',
    AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh',
    BY: 'Belarus', BE: 'Belgium', BJ: 'Benin', BO: 'Bolivia', BA: 'Bosnia and Herzegovina',
    BW: 'Botswana', BR: 'Brazil', BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi',
    KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada', CV: 'Cape Verde', CF: 'Central African Republic',
    TD: 'Chad', CL: 'Chile', CN: 'China', CO: 'Colombia', CG: 'Congo',
    CD: 'Democratic Republic of Congo', CR: 'Costa Rica', CI: "Côte d'Ivoire", HR: 'Croatia',
    CU: 'Cuba', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', DJ: 'Djibouti',
    DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea',
    ER: 'Eritrea', EE: 'Estonia', ET: 'Ethiopia', FI: 'Finland', FR: 'France',
    GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany', GH: 'Ghana',
    GR: 'Greece', GT: 'Guatemala', GN: 'Guinea', GW: 'Guinea-Bissau', HT: 'Haiti',
    HN: 'Honduras', HU: 'Hungary', IN: 'India', ID: 'Indonesia', IR: 'Iran',
    IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica',
    JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya', KW: 'Kuwait',
    KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia',
    LY: 'Libya', LT: 'Lithuania', LU: 'Luxembourg', MG: 'Madagascar', MW: 'Malawi',
    MY: 'Malaysia', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', MX: 'Mexico',
    MD: 'Moldova', MN: 'Mongolia', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
    NA: 'Namibia', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NI: 'Nicaragua',
    NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman', PK: 'Pakistan',
    PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PH: 'Philippines', PL: 'Poland',
    PT: 'Portugal', QA: 'Qatar', RO: 'Romania', RU: 'Russia', RW: 'Rwanda',
    SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia', SL: 'Sierra Leone', SO: 'Somalia',
    ZA: 'South Africa', SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan',
    SZ: 'Eswatini', SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan',
    TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo',
    TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan', UG: 'Uganda', UA: 'Ukraine',
    AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States', UY: 'Uruguay',
    UZ: 'Uzbekistan', VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia',
    ZW: 'Zimbabwe', KM: 'Comoros', SC: 'Seychelles', ST: 'São Tomé and Príncipe',
    EH: 'Western Sahara', MK: 'North Macedonia', SK: 'Slovakia', SI: 'Slovenia',
    FJ: 'Fiji', PG: 'Papua New Guinea', SB: 'Solomon Islands',
};
const NAME_TO_ISO = Object.fromEntries(Object.entries(ISO_TO_NAME).map(([code, name]) => [name.toLowerCase(), code]));
const COUNTRY_ALIASES = {
    'nigeria': 'NG', 'kenya': 'KE', 'tanzania': 'TZ', 'ghana': 'GH', 'ethiopia': 'ET',
    'angola': 'AO', 'benin': 'BJ', 'cameroon': 'CM', 'senegal': 'SN', 'mali': 'ML',
    'burkina faso': 'BF', 'zimbabwe': 'ZW', 'mozambique': 'MZ', 'zambia': 'ZM',
    'malawi': 'MW', 'rwanda': 'RW', 'uganda': 'UG', 'south africa': 'ZA', 'egypt': 'EG',
    'morocco': 'MA', 'algeria': 'DZ', 'tunisia': 'TN', 'sudan': 'SD', 'south sudan': 'SS',
    'chad': 'TD', 'niger': 'NE', 'somalia': 'SO', 'eritrea': 'ER', 'djibouti': 'DJ',
    'madagascar': 'MG', 'mauritius': 'MU', 'cape verde': 'CV', 'gabon': 'GA',
    'congo': 'CG', 'dr congo': 'CD', 'drc': 'CD', 'democratic republic of congo': 'CD',
    'central african republic': 'CF', 'equatorial guinea': 'GQ', 'liberia': 'LR',
    'sierra leone': 'SL', 'guinea': 'GN', "guinea-bissau": 'GW', 'gambia': 'GM',
    'togo': 'TG', 'mauritania': 'MR', 'libya': 'LY', 'namibia': 'NA', 'botswana': 'BW',
    'eswatini': 'SZ', 'swaziland': 'SZ', 'lesotho': 'LS', "cote d'ivoire": 'CI',
    'ivory coast': 'CI', 'usa': 'US', 'united states': 'US', 'uk': 'GB',
    'united kingdom': 'GB', 'france': 'FR', 'germany': 'DE', 'india': 'IN',
    'china': 'CN', 'brazil': 'BR', 'canada': 'CA', 'australia': 'AU', 'japan': 'JP',
    'italy': 'IT', 'spain': 'ES', 'portugal': 'PT', 'russia': 'RU', 'indonesia': 'ID',
    'pakistan': 'PK', 'bangladesh': 'BD', 'mexico': 'MX', 'philippines': 'PH',
    'burundi': 'BI', 'comoros': 'KM', 'seychelles': 'SC',
};
export function resolveCountry(lower) {
    const aliases = Object.entries({ ...NAME_TO_ISO, ...COUNTRY_ALIASES })
        .sort((a, b) => b[0].length - a[0].length);
    for (const [name, code] of aliases) {
        if (lower.includes(name))
            return code;
    }
    return undefined;
}
//# sourceMappingURL=countries.js.map