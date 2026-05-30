const fs = require('fs');

const firstNames = ["Chidi", "Amina", "Oluwaseun", "Blessing", "Ibrahim", "Titilayo", "Emeka", "Fatima", "Uchechi", "Babajide", "Nneka", "Tunde", "Zainab", "Kelechi", "Abisola"];
const lastNames = ["Okeke", "Abubakar", "Ajayi", "Nwosu", "Musa", "Adebayo", "Kalu", "Yusuf", "Obi", "Sanwo", "Eze", "Bello", "Okonkwo", "Danladi", "Olowo"];

const generateNigerianIdentity = (index) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // Generates a unique 11-digit BVN starting from a base number
    const bvn = (22200000000 + index).toString(); 
    
    // Generates a random Nigerian phone number
    const prefixes = ["0803", "0810", "0706", "0905", "0802"];
    const phone = prefixes[Math.floor(Math.random() * prefixes.length)] + Math.floor(1000000 + Math.random() * 9000000);
    
    // Random Date of Birth between 1970 and 2004
    const year = Math.floor(Math.random() * (2004 - 1970 + 1)) + 1970;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

    return {
        bvn: bvn,
        fullName: `${firstName} ${lastName}`,
        phoneNumber: phone,
        dateOfBirth: `${year}-${month}-${day}`
    };
};

const identities = Array.from({ length: 50 }, (_, i) => generateNigerianIdentity(i));

fs.writeFileSync('mock_identity.json', JSON.stringify(identities, null, 2));
console.log("✅ 50 Random Nigerian Identities generated in mock_identity.json");