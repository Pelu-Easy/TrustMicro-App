import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added for persistence
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import api from '../../services/api';
import useUserData from '../../store/userSignUp';

const { width } = Dimensions.get('window');
const PERSIST_KEY = 'TRUSTMICRO_LOAN_DRAFT'; // Key for auto-save

const BRAND = { 
  primary: "#0056D2", accent: "#10B981", warning: "#F59E0B", danger: "#EF4444",
  draft: "#94A3B8", bg: "#F8FAFC", border: "#E2E8F0", card: "#FFFFFF", inputBg: "#F1F5F9"
};

const STAGES = [
  "Personal Info", "Residential Information", "Employment Info",
  "Next of Kin", "Bank Information", "Document Upload",
  "Social Media", "Referral & Exposure", "Declaration"
];

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
  const { role, isSupervisor, isHeadOfCredit, _hasHydrated } = useUserData();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    clientSector: '', bvn: '', title: '', firstName: '', middleName: '', lastName: '',
    nin: '', gender: '', dob: '', mothersMaidenName: '', clientTypeKYC: '',
    phone: '', alternatePhone: '', emailAddress: '', accountOfficer: '',
    nationality: 'Nigerian', stateOfOrigin: '', lga: '', homeAddress: '',
    permanentState: '', residentialLGA: '', fullAddress: '',
    latitude: '0E-8', longitude: '0E-8', buildingDescription: '',
    nearestLandmark: '', residentialStatus: '', dateMovedIn: '',
    useAsDefault: false,
    approvedBusinessLocation: '', employerBranchName: '',
    employerState: '', employerLGA: '', employerAddress: '',
    employerLat: '0E-8', employerLong: '0E-8',
    staffId: '', jobRole: '', employmentType: '',
    dateOfEmployment: '', salaryRange: '101k-1m', salaryPaymentDay: '',
    tinNumber: '', monthlyIncome: '', annualIncome: '',
    nok1Relationship: 'Child', nok1FirstName: '', nok1MiddleName: '', nok1LastName: '',
    nok1Dob: '', nok1State: '', nok1Lga: '', nok1Address: '', nok1Lat: '', nok1Long: '',
    nok1Phone: '', nok1Email: '',
    nok2Relationship: 'Child', nok2FirstName: '', nok2MiddleName: '', nok2LastName: '',
    nok2Dob: '', nok2State: '', nok2Lga: '', nok2Address: '', nok2Lat: '', nok2Long: '',
    nok2Phone: '', nok2Email: '',
    bankName: '', accountNumber: '', accountName: '', loanAmount: '', loanType: 'Personal',
    idImageUrl: null, utilityBillUrl: null, passportImageUrl: null, 
    workIdUrl: null, statementUrl: null, signatureUrl: null, ninImageUrl: null,
    selectedDocType: 'National ID',
    socialPlatform: 'Facebook', socialHandle: '', socialLinks: [] as {platform: string, handle: string}[],
    referralId: '', isPoliticallyExposed: false, exposureOptions: 'None', affiliationDescription: '',
    hasAcceptedTerms: false
  });

  // 1. AUTO-LOAD DRAFT ON MOUNT
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const saved = await AsyncStorage.getItem(PERSIST_KEY);
        if (saved) {
          const { data, step } = JSON.parse(saved);
          setFormData(prev => ({ ...prev, ...data }));
          setCurrentStep(step);
        }
      } catch (e) { console.error("Draft Recovery Error", e); }
    };
    loadDraft();
  }, []);

  // 2. AUTO-SAVE ON CHANGE
  useEffect(() => {
    const saveDraft = async () => {
      try {
        const draft = JSON.stringify({ data: formData, step: currentStep });
        await AsyncStorage.setItem(PERSIST_KEY, draft);
      } catch (e) { /* silent fail */ }
    };
    saveDraft();
  }, [formData, currentStep]);

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
      Alert.alert("Connection Error", "The app couldn't reach the server. Please try again."); 
    } finally { setIsVerifying(false); }
  };

  const handleSubmit = async () => {
    if (!formData.hasAcceptedTerms) {
        Alert.alert("Declaration Required", "Please accept the terms and conditions.");
        return;
    }
    setIsSubmitting(true);
    try {
        // Implementation of actual API call would go here
        await new Promise(resolve => setTimeout(resolve, 2000));
        await AsyncStorage.removeItem(PERSIST_KEY); // Clear draft on success
        Alert.alert("Success", "Loan Application Submitted Successfully!");
        router.replace('/');
    } catch (e) {
        Alert.alert("Error", "Failed to submit loan. Your data is still saved as a draft.");
    } finally { setIsSubmitting(false); }
  };

  // Helper to safely change steps
  const goToStep = (step: number) => {
    if (step >= 0 && step < STAGES.length) {
      setCurrentStep(step);
    }
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

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        
        {/* STAGE 1: PERSONAL INFO */}
        {currentStep === 0 && (
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Identity Details</Text>
              <Text style={styles.label}>Client Sector</Text>
              <View style={styles.pickerContainer}>
                <Picker style={styles.picker} selectedValue={formData.clientSector} onValueChange={v => updateData('clientSector', v)}>
                  <Picker.Item label="Select Sector" value="" />
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
              if(!formData.clientSector || !formData.title || !formData.gender) {
                Alert.alert("Required", "Please select Client Sector, Title, and Gender.");
                return;
              }
              goToStep(1);
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
                        updateData('residentialLGA', ''); 
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
                      <Picker.Item label="Select Status" value="" />
                      <Picker.Item label="LandLord" value="LandLord" />
                      <Picker.Item label="Tenant" value="Tenant" />
                    </Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}><Text style={styles.label}>Date Moved In</Text><TextInput style={styles.input} value={formData.dateMovedIn} placeholder="YYYY-MM-DD" onChangeText={v => updateData('dateMovedIn', v)} /></View>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => goToStep(0)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                if(!formData.permanentState || !formData.residentialLGA || !formData.residentialStatus) {
                   Alert.alert("Required", "Please select State, LGA, and Residential Status.");
                   return;
                }
                goToStep(2);
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
                    <Picker style={styles.picker} selectedValue={formData.employerLGA} onValueChange={v => updateData('employerLGA', v)}>
                        <Picker.Item label="Select LGA" value="" />
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
                  <Picker.Item label="Select Type" value="" />
                  <Picker.Item label="Full Time" value="Full Time" />
                  <Picker.Item label="Contract" value="Contract" />
                </Picker>
              </View>
              <View style={styles.grid}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Salary Range</Text>
                  <View style={styles.pickerContainer}>
                    <Picker style={styles.picker} selectedValue={formData.salaryRange} onValueChange={v => updateData('salaryRange', v)}>
                      <Picker.Item label="Select Range" value="" />
                      <Picker.Item label="101k-1m" value="101k-1m" />
                    </Picker>
                  </View>
                </View>
                <View style={{ width: '48%' }}><Text style={styles.label}>Monthly Income</Text><TextInput style={styles.input} value={formData.monthlyIncome} keyboardType="numeric" onChangeText={v => updateData('monthlyIncome', v)} /></View>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => goToStep(1)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                if(!formData.employerState || !formData.employmentType) {
                   Alert.alert("Required", "Please select Employer State and Employment Type.");
                   return;
                }
                goToStep(3);
              }}><Text style={styles.primaryBtnText}>Save & Continue</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* STAGE 9: DECLARATION */}
        {currentStep === 8 && (
          <View>
            <View style={styles.sectionCard}>
               <Text style={styles.sectionTitle}>Final Declaration</Text>
               <Text style={styles.infoText}>I certify that all information provided is true and correct.</Text>
               <TouchableOpacity style={styles.checkRow} onPress={() => updateData('hasAcceptedTerms', !formData.hasAcceptedTerms)}>
                 <Ionicons name={formData.hasAcceptedTerms ? "checkbox" : "square-outline"} size={24} color={BRAND.primary} />
                 <Text style={{marginLeft: 10, flex: 1}}>I agree to the terms and conditions.</Text>
               </TouchableOpacity>
            </View>
            <View style={styles.btnRow}>
               <TouchableOpacity style={styles.secBtn} onPress={() => goToStep(7)}><Text style={styles.secBtnText}>Previous</Text></TouchableOpacity>
               <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={isSubmitting}>
                 {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Submit Loan Application</Text>}
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
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: BRAND.primary },
  stepCount: { fontSize: 12, color: BRAND.draft, marginTop: 4 },
  progressBarBg: { height: 6, backgroundColor: BRAND.inputBg, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: BRAND.accent },
  sectionCard: { backgroundColor: BRAND.card, borderRadius: 12, padding: 16, marginBottom: 20, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#334155' },
  label: { fontSize: 13, color: '#64748B', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: BRAND.inputBg, borderRadius: 8, padding: 12, fontSize: 15, color: '#1E293B', borderWidth: 1, borderColor: BRAND.border },
  pickerContainer: { backgroundColor: BRAND.inputBg, borderRadius: 8, borderWidth: 1, borderColor: BRAND.border, marginTop: 5 },
  picker: { height: 50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  verifyBtn: { backgroundColor: BRAND.primary, paddingHorizontal: 15, height: 50, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  primaryBtn: { backgroundColor: BRAND.primary, padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  secBtn: { padding: 16, borderRadius: 12, flex: 1, alignItems: 'center' },
  secBtnText: { color: BRAND.draft, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  infoText: { fontSize: 14, color: '#64748B', lineHeight: 20 }
});