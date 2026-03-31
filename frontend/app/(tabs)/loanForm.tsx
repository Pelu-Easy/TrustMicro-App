import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

// --- STORES & UTILS ---
import api from '../../services/api';
import useUserData from '../../store/userSignUp';

const { width } = Dimensions.get('window');

const BRAND = { 
  primary: "#0056D2", 
  accent: "#10B981", 
  warning: "#F59E0B", 
  danger: "#EF4444",
  draft: "#94A3B8", 
  bg: "#F8FAFC", 
  border: "#E2E8F0",
  card: "#FFFFFF",
  inputBg: "#F1F5F9"
};

const STAGES = [
  "Personal Info",
  "Residential Information",
  "Employment Info",
  "Next of Kin",
  "Bank Information",
  "Document Upload",
  "Social Media",
  "Referral & Exposure",
  "Declaration"
];

// --- NIGERIA DATA ---
const NIGERIAN_STATES: { [key: string]: string[] } = {
  "Abia": ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiala Ngwa North", "Isiala Ngwa South", "Isuikwuato", "Obingwa", "Ohafia", "Osisioma", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umu-Nneochi"],
  "Adamawa": ["Demsa", "Fufore", "Ganye", "Girei", "Gombi", "Guyuk", "Hong", "Jada", "Lamurde", "Madagali", "Maiha", "Mayo-Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"],
  "Akwa Ibom": ["Abak", "Eastern Obolo", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiono Ibom", "Ika", "Ikono", "Ikot Abasi", "Ikot Ekpene", "Ini", "Itu", "Mbo", "Mkpat Enin", "Nsit Atai", "Nsit Ibom", "Nsit Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anam", "Udung Uko", "Ukanafun", "Uruan", "Urue-Offong/Oruko", "Uyo"],
  "Anambra": ["Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"],
  "Bauchi": ["Alkaleri", "Bauchi", "Bogoro", "Damban", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Itas/Gadau", "Jama'are", "Katagum", "Kirfi", "Misau", "Ningi", "Shira", "Tafawa-Balewa", "Toro", "Warji", "Zaki"],
  "Bayelsa": ["Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"],
  "Benue": ["Ado", "Agatu", "Apa", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Makurdi", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Otukpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"],
  "Borno": ["Abadam", "Askira/Uba", "Bama", "Bayo", "Biu", "Chibok", "Damboa", "Dikwa", "Gubio", "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kukawa", "Kwaya Kusar", "Mafa", "Magumeri", "Maiduguri", "Marte", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani"],
  "Cross River": ["Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Bekwarra", "Biase", "Boki", "Calabar Municipal", "Calabar South", "Etung", "Ikom", "Obanliku", "Obubra", "Obudu", "Odukpani", "Ogoja", "Yakuur", "Yala"],
  "Delta": ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
  "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu", "Onicha"],
  "Edo": ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba Okha", "Orhionmwon", "Oredo", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Uhunmwonde"],
  "Ekiti": ["Ado Ekiti", "Efon", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ikole", "Ilejemeje", "Irepodun/Ifelodun", "Ise/Orun", "Moba", "Oye"],
  "Enugu": ["Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo-Uwani"],
  "FCT": ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"],
  "Gombe": ["Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
  "Imo": ["Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte/Uboma", "Ikeduru", "Isiala Mbano", "Isu", "Mbaitoli", "Ngor Okpala", "Njaba", "Nkwerre", "Nwangele", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Orlu", "Orsu", "Oru East", "Oru West", "Owerri Municipal", "Owerri North", "Owerri West", "Unuimo"],
  "Jigawa": ["Auyo", "Babura", "Biriniwa", "Birnin Kudu", "Buji", "Dutse", "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa", "Hadejia", "Jahun", "Kafin Hausa", "Kaugama", "Kazaure", "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori", "Miga", "Ringim", "Roni", "Sule Tankarkar", "Taura", "Yankwashi"],
  "Kaduna": ["Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"],
  "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Mallam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir", "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Kumbotso", "Shanono", "Sumaila", "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"],
  "Katsina": ["Bakori", "Batagarawa", "Batsari", "Baure", "Bindawa", "Charanchi", "Dandume", "Danja", "Dan Musa", "Daura", "Dutsi", "Dutsin Ma", "Faskari", "Funtua", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Katsina", "Kurfi", "Kusada", "Mai'Adua", "Malumfashi", "Mani", "Mashi", "Musawa", "Rimi", "Sabuwa", "Safana", "Sandamu", "Zango"],
  "Kebbi": ["Aleiro", "Arewa Dandi", "Argungu", "Augie", "Bagudo", "Birnin Kebbi", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo", "Koko/Besse", "Maiyama", "Ngaski", "Sakaba", "Shanga", "Suru", "Wasagu/Danko", "Yauri", "Zuru"],
  "Kogi": ["Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Ibaji", "Idah", "Igalamela Odolu", "Ijumu", "Kabba/Bunu", "Kogi", "Lokoja", "Mopa Muro", "Ofu", "Ogori/Magongo", "Okehi", "Okene", "Olamaboro", "Omala", "Yagba East", "Yagba West"],
  "Kwara": ["Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Ilorin East", "Ilorin South", "Ilorin West", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke Ero", "Oyun", "Pategi"],
  "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"],
  "Nasarawa": ["Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi", "Kokona", "Lafia", "Nasarawa", "Nasarawa Egon", "Obi", "Toto", "Wamba"],
  "Niger": ["Agaie", "Agwara", "Bida", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako", "Gurara", "Katcha", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mashegu", "Mokwa", "Moya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Wushishi"],
  "Ogun": ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Ewekoro", "Ifo", "Ijebu East", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Shagamu", "Yewa North", "Yewa South"],
  "Ondo": ["Akoko North-East", "Akoko North-West", "Akoko South-West", "Akoko South-East", "Akure North", "Akure South", "Ese Odo", "Idanre", "Ifedore", "Ilaje", "Ile Oluji/Okeigbo", "Irele", "Odigbo", "Okitipupa", "Ondo East", "Ondo West", "Ose", "Owo"],
  "Osun": ["Atakunmosa East", "Atakunmosa West", "Aiyedaade", "Aiyedire", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Ife Central", "Ife East", "Ife North", "Ife South", "Egbedore", "Ejigbo", "Ifedayo", "Ifelodun", "Ila", "Ilesa East", "Ilesa West", "Irepodun", "Irewole", "Isokan", "Iwo", "Obokun", "Odo Otin", "Ola Oluwa", "Olorunda", "Oriade", "Orolu", "Osogbo"],
  "Oyo": ["Afijio", "Akinyele", "Atiba", "Atisbo", "Egbeda", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East", "Ibarapa North", "Ido", "Irepo", "Iseyin", "Itesiwaju", "Iwajowa", "Kajola", "Lagelu", "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Ori Ire", "Oyo", "Oyo East", "Saki East", "Saki West", "Surulere"],
  "Plateau": ["Bokkos", "Barkin Ladi", "Bassa", "Jos East", "Jos North", "Jos South", "Kanam", "Kanke", "Langtang North", "Langtang South", "Mangu", "Mikang", "Pankshin", "Qua'an Pan", "Riyom", "Shendam", "Wase"],
  "Rivers": ["Abua/Odual", "Ahoada East", "Ahoada West", "Akuku-Toru", "Andoni", "Asari-Toru", "Bonny", "Degema", "Eleme", "Emuoha", "Etche", " Gokana", "Ikwerre", "Khana", "Obio/Akpor", "Ogba/Egbema/Ndoni", "Ogu/Bolo", "Okrika", "Omuma", "Opobo/Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
  "Sokoto": ["Binji", "Bodinga", "Dange Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware", "Rabah", "Sabon Birni", "Shagari", "Silame", "Sokoto North", "Sokoto South", "Tambuwal", "Tangaza", "Tureta", "Wamako", "Wurno", "Yabo"],
  "Taraba": ["Ardo Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Jalingo", "Karim Lamido", "Kumi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro", "Zing"],
  "Yobe": ["Bade", "Bursari", "Damaturu", "Fika", "Fune", "Geidam", "Gujba", "Gulani", "Jakusko", "Karasuwa", "Machina", "Nangere", "Nguru", "Potiskum", "Tarmuwa", "Yunusari", "Yusufari"],
  "Zamfara": ["Anka", "Bakura", "Birnin Magaji/Kiyaw", "Bukkuyum", "Bungudu", "Gummi", "Gusau", "Kaura Namoda", "Maradun", "Maru", "Shinkafi", "Talata Mafara", "Chafe", "Zurmi"]
};

export default function CompleteLoanForm() {
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(0); 
  const { 
    role, 
    isSupervisor, 
    isHeadOfCredit,
    _hasHydrated 
  } = useUserData();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // --- STAGE 1: PERSONAL INFO ---
    clientSector: 'Federal', bvn: '', title: '', firstName: '', middleName: '', lastName: '',
    nin: '', gender: '', dob: '', mothersMaidenName: '', clientTypeKYC: '',
    phone: '', alternatePhone: '', emailAddress: '', accountOfficer: '',
    nationality: 'Nigerian', stateOfOrigin: 'Kogi', lga: 'Ankpa', homeAddress: '',

    // --- STAGE 2: RESIDENTIAL INFORMATION ---
    permanentState: '', residentialLGA: '', fullAddress: '',
    latitude: '0E-8', longitude: '0E-8', buildingDescription: '',
    nearestLandmark: '', residentialStatus: 'LandLord', dateMovedIn: '',
    useAsDefault: false,

    // --- STAGE 3: EMPLOYMENT INFO ---
    approvedBusinessLocation: '', employerBranchName: 'NSCDC',
    employerState: 'Kogi', employerLGA: 'Ankpa', employerAddress: '',
    employerLat: '0E-8', employerLong: '0E-8',
    staffId: '', jobRole: 'OPERATIONS', employmentType: 'Full Time',
    dateOfEmployment: '', salaryRange: '101k-1m', salaryPaymentDay: '',
    tinNumber: '', monthlyIncome: '', annualIncome: '',

    // --- STAGE 4: NEXT OF KIN ---
    nok1Relationship: 'Child', nok1FirstName: '', nok1MiddleName: '', nok1LastName: '',
    nok1Dob: '', nok1State: '', nok1Lga: '', nok1Address: '', nok1Lat: '', nok1Long: '',
    nok1Phone: '', nok1Email: '',
    nok2Relationship: 'Child', nok2FirstName: '', nok2MiddleName: '', nok2LastName: '',
    nok2Dob: '', nok2State: '', nok2Lga: '', nok2Address: '', nok2Lat: '', nok2Long: '',
    nok2Phone: '', nok2Email: '',

    // --- STAGE 5: BANK INFORMATION ---
    bankName: '', accountNumber: '', accountName: '', loanAmount: '', loanType: 'Personal',

    // --- STAGE 6: DOCUMENT UPLOAD ---
    idImageUrl: null, utilityBillUrl: null, passportImageUrl: null, 
    workIdUrl: null, statementUrl: null, signatureUrl: null, ninImageUrl: null,
    selectedDocType: 'National ID',

    // --- STAGE 7: SOCIAL MEDIA ---
    socialPlatform: 'Facebook', socialHandle: '', socialLinks: [] as {platform: string, handle: string}[],

    // --- STAGE 8: REFERRAL & POLITICAL EXPOSURE ---
    referralId: '', isPoliticallyExposed: false, exposureOptions: 'None', affiliationDescription: '',

    // --- STAGE 9: DECLARATION ---
    hasAcceptedTerms: false
  });

  useEffect(() => {
    if (!_hasHydrated) return;
    const userRole = role?.toLowerCase() || '';
    const isManagement = isSupervisor || isHeadOfCredit || ['manager', 'admin', 'cco', 'md', 'finance'].includes(userRole);
    if (isManagement) router.replace('/'); 
  }, [_hasHydrated, role, isHeadOfCredit, isSupervisor]);

  const updateData = (key: keyof typeof formData, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  const pickDocument = async (key: keyof typeof formData) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled) {
        updateData(key, result.assets[0]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

const handleVerifyIdentity = async () => {
    if (formData.bvn.length < 11) { 
      Alert.alert("Error", "Enter 11-digit BVN"); 
      return; 
    }
    
    setIsVerifying(true);
    try {
      const res = await api.post('/manager/verify-bvn', { bvn: formData.bvn });
      console.log("Verification Response:", res.data);

      if (res.data.status === "success" && res.data.data) {
        const c = res.data.data;
        setFormData(prev => ({
          ...prev,
          firstName: c.firstName || c.first_name || '', 
          lastName: c.lastName || c.last_name || '',
          middleName: c.middleName || c.middle_name || '', 
          dob: c.dateOfBirth || c.dob || '',
          phone: c.phoneNumber || c.phone || '', 
          nin: c.nin || '', 
          gender: c.gender || '' 
        }));
        Alert.alert("Success", "Identity Verified");
      } else {
        Alert.alert("Verification Failed", res.data.message || "Invalid BVN details.");
      }
    } catch (e: any) { 
      console.error("Frontend Verify Error:", e);
      Alert.alert("Network Error", "The server connection was reset. Please try again."); 
    } finally { 
      setIsVerifying(false); 
    }
  };

  const handleSubmit = async () => {
    if (!formData.hasAcceptedTerms) {
        Alert.alert("Declaration Required", "Please accept the terms and conditions to proceed.");
        return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
        setIsSubmitting(false);
        Alert.alert("Success", "Loan Application Submitted Successfully!");
        router.replace('/');
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={styles.stepTitle}>{STAGES[currentStep]}</Text>
        <Text style={styles.stepCount}>Step {currentStep + 1} of 9</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentStep + 1) / 9) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* STAGE 1: PERSONAL INFO */}
        {currentStep === 0 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Identity Details</Text>
              <Text style={styles.label}>Client Sector</Text>
              <View style={styles.pickerContainer}>
                <Picker style={styles.picker} selectedValue={formData.clientSector} onValueChange={v => updateData('clientSector', v)}>
                  <Picker.Item label="Federal" value="Federal" />
                  <Picker.Item label="State" value="State" />
                  <Picker.Item label="Private" value="Private" />
                </Picker>
              </View>

              <Text style={styles.label}>Enter Client BVN *</Text>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} value={formData.bvn} onChangeText={v => updateData('bvn', v)} keyboardType="numeric" maxLength={11} />
                <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyIdentity}>
                  {isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify</Text>}
                </TouchableOpacity>
              </View>

              <View style={styles.grid}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Title</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.title} onValueChange={v => updateData('title', v)}>
                      <Picker.Item label="Select Title" value="" />
                      <Picker.Item label="Mr" value="Mr" />
                      <Picker.Item label="Mrs" value="Mrs" />
                      <Picker.Item label="Miss" value="Miss" />
                      <Picker.Item label="Dr" value="Dr" />
                    </Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.gender} onValueChange={v => updateData('gender', v)}>
                      <Picker.Item label="Select Gender" value="" />
                      <Picker.Item label="Male" value="Male" />
                      <Picker.Item label="Female" value="Female" />
                    </Picker>
                  </View>
                </View>
              </View>
              <Text style={styles.label}>First Name</Text><TextInput style={styles.input} value={formData.firstName} onChangeText={v => updateData('firstName', v)} />
              <Text style={styles.label}>Last Name</Text><TextInput style={styles.input} value={formData.lastName} onChangeText={v => updateData('lastName', v)} />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => {
              if(!formData.title || !formData.gender) {
                Alert.alert("Required", "Please select both Title and Gender.");
                return;
              }
              setCurrentStep(1);
            }}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
          </View>
        )}

        {/* STAGE 2: RESIDENTIAL INFORMATION */}
        {currentStep === 1 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Address Details</Text>
              <View style={styles.grid}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Permanent State</Text>
                  <View style={styles.pickerContainer}>
                    <Picker 
                      style={styles.picker} 
                      selectedValue={formData.permanentState} 
                      onValueChange={v => {
                        updateData('permanentState', v);
                        updateData('residentialLGA', ''); // Reset LGA when state changes
                      }}
                    >
                      <Picker.Item label="Select State" value="" />
                      {Object.keys(NIGERIAN_STATES).sort().map(state => (
                        <Picker.Item key={state} label={state} value={state} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>LGA</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      style={styles.picker}
                      selectedValue={formData.residentialLGA}
                      onValueChange={v => updateData('residentialLGA', v)}
                      enabled={formData.permanentState !== ''}
                    >
                      <Picker.Item label="Select LGA" value="" />
                      {formData.permanentState ? NIGERIAN_STATES[formData.permanentState].map(lga => (
                        <Picker.Item key={lga} label={lga} value={lga} />
                      )) : null}
                    </Picker>
                  </View>
                </View>
              </View>
              <Text style={styles.label}>Full Residential Address</Text><TextInput style={styles.input} value={formData.fullAddress} onChangeText={v => updateData('fullAddress', v)} multiline />
              <View style={styles.grid}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.residentialStatus} onValueChange={v => updateData('residentialStatus', v)}>
                      <Picker.Item label="LandLord" value="LandLord" /><Picker.Item label="Tenant" value="Tenant" />
                    </Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}><Text style={styles.label}>Date Moved In</Text><TextInput style={styles.input} value={formData.dateMovedIn} placeholder="YYYY-MM-DD" onChangeText={v => updateData('dateMovedIn', v)} /></View>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(0)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                if(!formData.permanentState || !formData.residentialLGA) {
                   Alert.alert("Required", "Please select both State and LGA.");
                   return;
                }
                setCurrentStep(2);
              }}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 3: EMPLOYMENT INFO */}
        {currentStep === 2 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Company Details</Text>
              <Text style={styles.label}>Business Location</Text><TextInput style={styles.input} value={formData.approvedBusinessLocation} onChangeText={v => updateData('approvedBusinessLocation', v)} />
              <View style={styles.grid}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>State</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.employerState} onValueChange={v => updateData('employerState', v)}>
                        {Object.keys(NIGERIAN_STATES).sort().map(state => (
                          <Picker.Item key={state} label={state} value={state} />
                        ))}
                    </Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>LGA</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.employerLGA} onValueChange={v => updateData('employerLGA', v)}>
                        {NIGERIAN_STATES[formData.employerState]?.map(lga => (
                          <Picker.Item key={lga} label={lga} value={lga} />
                        ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Work Details</Text>
              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerContainer}>
                <Picker style={styles.picker} selectedValue={formData.employmentType} onValueChange={v => updateData('employmentType', v)}>
                  <Picker.Item label="Full Time" value="Full Time" /><Picker.Item label="Contract" value="Contract" />
                </Picker>
              </View>
              <View style={styles.grid}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Salary Range</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.salaryRange} onValueChange={v => updateData('salaryRange', v)}><Picker.Item label="101k-1m" value="101k-1m" /></Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}><Text style={styles.label}>Monthly Income</Text><TextInput style={styles.input} value={formData.monthlyIncome} keyboardType="numeric" onChangeText={v => updateData('monthlyIncome', v)} /></View>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(1)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(3)}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 4: NEXT OF KIN */}
        {currentStep === 3 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Next of Kin 1</Text>
              <Text style={styles.label}>Relationship</Text>
              <View style={styles.pickerContainer}>
                <Picker style={styles.picker} selectedValue={formData.nok1Relationship} onValueChange={v => updateData('nok1Relationship', v)}>
                  <Picker.Item label="Child" value="Child" /><Picker.Item label="Spouse" value="Spouse" /><Picker.Item label="Parent" value="Parent" />
                </Picker>
              </View>
              <TextInput style={[styles.input, {marginTop: 10}]} placeholder="First Name" value={formData.nok1FirstName} onChangeText={v => updateData('nok1FirstName', v)} />
              <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Phone" value={formData.nok1Phone} keyboardType="phone-pad" onChangeText={v => updateData('nok1Phone', v)} />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(2)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(4)}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 5: BANK INFO */}
        {currentStep === 4 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Disbursement</Text>
              <Text style={styles.label}>Account Number</Text>
              <TextInput style={styles.input} value={formData.accountNumber} keyboardType="numeric" maxLength={10} onChangeText={v => updateData('accountNumber', v)} />
              <Text style={styles.label}>Loan Amount</Text>
              <TextInput style={styles.input} value={formData.loanAmount} keyboardType="numeric" onChangeText={v => updateData('loanAmount', v)} />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(3)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(5)}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 6: DOCUMENT UPLOAD */}
        {currentStep === 5 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Documents</Text>
              <Text style={styles.label}>Type</Text>
              <View style={styles.pickerContainer}>
                <Picker style={styles.picker} selectedValue={formData.selectedDocType} onValueChange={v => updateData('selectedDocType', v)}>
                  <Picker.Item label="National ID" value="National ID" /><Picker.Item label="Utility Bill" value="Utility Bill" />
                </Picker>
              </View>
              <TouchableOpacity style={[styles.uploadRow, {marginTop: 20}]} onPress={() => pickDocument('idImageUrl')}>
                <Ionicons name="cloud-upload" size={24} color={BRAND.primary} />
                <Text style={{marginLeft: 10}}>{(formData.idImageUrl as any)?.name || 'Upload ID'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(4)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(6)}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 7: SOCIAL MEDIA */}
        {currentStep === 6 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Social Presence</Text>
              <Text style={styles.label}>Platform</Text>
              <View style={styles.pickerContainer}>
                <Picker style={styles.picker} selectedValue={formData.socialPlatform} onValueChange={v => updateData('socialPlatform', v)}>
                  <Picker.Item label="Facebook" value="Facebook" /><Picker.Item label="Instagram" value="Instagram" /><Picker.Item label="Twitter" value="Twitter" />
                </Picker>
              </View>
              <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Handle" value={formData.socialHandle} onChangeText={v => updateData('socialHandle', v)} />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(5)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(7)}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 8: REFERRAL & POLITICAL EXPOSURE */}
        {currentStep === 7 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Referral</Text>
              <TextInput style={styles.input} placeholder="Referral ID" value={formData.referralId} onChangeText={v => updateData('referralId', v)} />
              
              <Text style={[styles.sectionTitle, {marginTop: 20}]}>Political Exposure</Text>
              <View style={styles.radioRow}>
                  <TouchableOpacity style={styles.radioItem} onPress={() => updateData('isPoliticallyExposed', true)}>
                      <Ionicons name={formData.isPoliticallyExposed ? "radio-button-on" : "radio-button-off"} size={20} color={BRAND.primary} />
                      <Text style={styles.radioLabel}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.radioItem} onPress={() => updateData('isPoliticallyExposed', false)}>
                      <Ionicons name={!formData.isPoliticallyExposed ? "radio-button-on" : "radio-button-off"} size={20} color={BRAND.primary} />
                      <Text style={styles.radioLabel}>No</Text>
                  </TouchableOpacity>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(6)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setCurrentStep(8)}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 9: DECLARATION */}
        {currentStep === 8 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Final Declaration</Text>
              <View style={styles.checkboxRow}>
                <Checkbox style={styles.checkbox} value={formData.hasAcceptedTerms} onValueChange={v => updateData('hasAcceptedTerms', v)} color={formData.hasAcceptedTerms ? BRAND.primary : undefined} />
                <Text style={styles.checkboxLabel}>I accept the Terms & Conditions</Text>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setCurrentStep(7)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit}>
                {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  progressHeader: { padding: 20, backgroundColor: BRAND.card, borderBottomWidth: 1, borderBottomColor: BRAND.border },
  stepTitle: { fontSize: 18, fontWeight: '700', color: BRAND.primary },
  stepCount: { fontSize: 12, color: BRAND.draft, marginTop: 4 },
  progressBarBg: { height: 6, backgroundColor: BRAND.border, borderRadius: 3, marginTop: 12 },
  progressBarFill: { height: 6, backgroundColor: BRAND.primary, borderRadius: 3 },
  sectionCard: { backgroundColor: BRAND.card, padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: BRAND.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: BRAND.inputBg, borderWidth: 1, borderColor: BRAND.border, padding: 12, borderRadius: 8, fontSize: 14 },
  
  pickerContainer: { 
    backgroundColor: BRAND.inputBg, 
    borderWidth: 1, 
    borderColor: BRAND.border, 
    borderRadius: 8, 
    marginTop: 4,
    justifyContent: 'center',
    height: Platform.OS === 'ios' ? 120 : 50, 
    overflow: 'hidden'
  },
  picker: {
    width: '100%',
    color: '#1E293B',
    ...Platform.select({
      android: { marginLeft: -8 }
    })
  },

  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: BRAND.inputBg, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: BRAND.primary },
  radioRow: { flexDirection: 'row', gap: 20, marginTop: 15 },
  radioItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioLabel: { fontSize: 14, color: '#1E293B' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 15 },
  checkbox: { width: 20, height: 20, borderRadius: 4 },
  checkboxLabel: { fontSize: 14, color: '#475569' },
  verifyBtn: { backgroundColor: BRAND.primary, paddingHorizontal: 20, height: 48, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  primaryBtn: { backgroundColor: BRAND.primary, padding: 18, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  secBtn: { backgroundColor: '#E2E8F0', padding: 18, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
  secBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 16 }
});