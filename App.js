import React, { useEffect, useState, createContext, useContext } from "react";
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL, SERVER_ORIGIN } from "./src/config";

const Stack = createNativeStackNavigator();
const Theme = { bg: "#F5F0EA", card: "#FFFCF8", ink: "#292522", muted: "#81766E", accent: "#8A5A44", border: "#E5D9CF" };
const ApiContext = createContext(null);
const useApi = () => useContext(ApiContext);

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Permintaan gagal.");
  return data;
}

const imgSrc = (url) => (!url ? null : url.startsWith("http") ? url : `${SERVER_ORIGIN}${url}`);

// Upload gambar ke backend (multipart/form-data), mengembalikan path seperti /uploads/xxx.jpg
async function uploadImage(uri) {
  const ext = (uri.split("?")[0].split(".").pop() || "jpg").toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const form = new FormData();
  form.append("image", { uri, name: `figure.${ext}`, type });
  const res = await fetch(`${API_BASE_URL}/uploads/image`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Upload gambar gagal.");
  return data.imageUrl;
}

function Button({ title, onPress, secondary = false }) {
  return <Pressable onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{title}</Text></Pressable>;
}
function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A99D93" multiline={multiline} keyboardType={keyboardType} style={[styles.input, multiline && { minHeight: 88, textAlignVertical: "top" }]} /></View>;
}
function HeaderIntro({ title, subtitle }) {
  return <View style={styles.intro}><Text style={styles.kicker}>HIRONO ARCHIVE</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>;
}
function Screen({ children }) { return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>; }

function HomeScreen({ navigation }) {
  const api = useApi();
  const [series, setSeries] = useState([]);
  const [figures, setFigures] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      const [s, f] = await Promise.all([request("/series"), request(`/figures?search=${encodeURIComponent(search)}`)]);
      setSeries(s); setFigures(f); 
    } catch (e) { Alert.alert("Tidak dapat memuat data", `${e.message}\nPastikan backend aktif dan alamat API benar.`); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => navigation.addListener("focus", load), [navigation, search]);
  const doSearch = async () => { setLoading(true); await load(); };
  return <Screen>
    <View style={styles.hero}>
      <Text style={styles.heroEyebrow}>COLLECT • EXPLORE • ARCHIVE</Text>
      <Text style={styles.heroTitle}>A little world of{`\n`}Hirono.</Text>
      <Text style={styles.heroText}>Arsip figur, cerita, dan koleksi yang kamu temukan di setiap perjalanan.</Text>
      <Button title="Lihat koleksi saya  →" onPress={() => navigation.navigate("My Collection")} />
    </View>
    <HeaderIntro title="Jelajahi seri" subtitle="Katalog seri Hirono. Informasi rilis dapat berbeda menurut wilayah." />
    {loading ? <ActivityIndicator color={Theme.accent} /> : <FlatList horizontal data={series} keyExtractor={x=>String(x.id)} showsHorizontalScrollIndicator={false} renderItem={({item})=><Pressable style={styles.seriesCard} onPress={()=>navigation.navigate("Series", { series: item })}><Text style={styles.seriesYear}>{item.releaseYear || "—"}</Text><Text style={styles.seriesName}>{item.name}</Text><Text style={styles.muted}>{item._count?.figures ?? 0} item katalog</Text></Pressable>} />}
    <HeaderIntro title="Figur di arsip" subtitle="Cari nama figur dari daftar katalog." />
    <Field label="Pencarian" value={search} onChangeText={setSearch} placeholder="Contoh: The Ghost" />
    <Button title="Cari figur" onPress={doSearch} secondary />
    {loading ? null : figures.slice(0, 12).map(item=><FigureRow key={item.id} item={item} onPress={()=>navigation.navigate("Figure Detail", { figure: item })} />)}
    <Text style={styles.footnote}>Katalog ini merupakan proyek penggemar, bukan aplikasi resmi POP MART. Nama dan gambar mengikuti sumber masing-masing.</Text>
  </Screen>;
}
function FigureRow({ item, onPress, right }) {
  return <Pressable style={styles.figureRow} onPress={onPress}>
    {item.imageUrl ? <Image source={{ uri: imgSrc(item.imageUrl) }} style={styles.figureImg} /> : <View style={styles.figureThumb}><Text style={styles.thumbText}>H</Text></View>}
    <View style={{flex:1}}><Text style={styles.figureName}>{item.name}</Text><Text style={styles.muted}>{item.series?.name || item.seriesName || "Seri tidak diketahui"}</Text><Text style={styles.tag}>{item.rarity || "Regular"}</Text></View>
    {right}
  </Pressable>;
}
function SeriesScreen({ route, navigation }) {
  const { series } = route.params;
  const [figures, setFigures] = useState([]);
  useEffect(() => {
    const load = () => request(`/figures?seriesId=${series.id}`).then(setFigures).catch(e=>Alert.alert("Error",e.message));
    load();
    return navigation.addListener("focus", load);
  }, [series.id, navigation]);
  return <Screen><HeaderIntro title={series.name} subtitle={`${series.releaseYear || "Tahun belum diverifikasi"} · ${series.description}`} />
    {figures.map(item=><FigureRow key={item.id} item={{...item, series}} onPress={()=>navigation.navigate("Figure Detail",{figure:{...item,series}})} />)}
    <Button title="Tambah figur ke katalog" onPress={()=>navigation.navigate("Manage Figure",{series})} />
  </Screen>;
}
function FigureDetailScreen({ route, navigation }) {
  const { figure } = route.params;
  const api = useApi();
  const add = async () => {
    try { await request("/collection", { method:"POST", body: JSON.stringify({figureId:figure.id, quantity:1}) }); Alert.alert("Berhasil","Figur ditambahkan ke koleksi pribadi."); }
    catch(e) { Alert.alert("Tidak berhasil",e.message); }
  };
  return <Screen>{figure.imageUrl ? <Image source={{ uri: imgSrc(figure.imageUrl) }} style={styles.detailImg} /> : <View style={styles.detailArt}><Text style={styles.detailLetter}>H</Text><Text style={styles.muted}>Gambar belum ditambahkan</Text></View>}
    <Text style={styles.kicker}>{figure.series?.name || "HIRONO"}</Text><Text style={styles.pageTitle}>{figure.name}</Text>
    <Text style={styles.tag}>{figure.rarity}</Text><Text style={styles.bodyText}>{figure.description || "Belum ada deskripsi untuk figur ini."}</Text>
    <Button title="Simpan ke koleksi saya" onPress={add} />
    <Button title="Edit informasi figur" secondary onPress={()=>navigation.navigate("Manage Figure",{figure,series:figure.series})} />
    <Button title="Hapus figur dari katalog" secondary onPress={()=>Alert.alert("Hapus figur?", "Figur akan dihapus dari katalog.", [{text:"Batal",style:"cancel"},{text:"Hapus",style:"destructive",onPress:async()=>{try{await request(`/figures/${figure.id}`,{method:"DELETE"});navigation.goBack();}catch(e){Alert.alert("Gagal",e.message);}}}])} />
  </Screen>;
}
function ManageFigureScreen({ route, navigation }) {
  const { figure, series } = route.params || {};
  const [seriesList,setSeriesList] = useState([]);
  const [name,setName] = useState(figure?.name || "");
  const [seriesId,setSeriesId] = useState(String(figure?.seriesId || series?.id || ""));
  const [rarity,setRarity] = useState(figure?.rarity || "Regular");
  const [description,setDescription] = useState(figure?.description || "");
  const [imageUrl] = useState(figure?.imageUrl || "");
  const [localUri,setLocalUri] = useState(null);
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Izin ditolak","Izinkan akses galeri untuk memilih gambar.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setLocalUri(result.assets[0].uri);
  };
  useEffect(()=>{request("/series").then(setSeriesList).catch(e=>Alert.alert("Error",e.message));},[]);
  const save = async () => {
    if (!name.trim() || !seriesId) return Alert.alert("Data belum lengkap","Nama figur dan seri wajib diisi.");
    try {
      const finalUrl = localUri ? await uploadImage(localUri) : imageUrl;
      const body=JSON.stringify({name:name.trim(),seriesId:Number(seriesId),rarity,description,imageUrl:finalUrl});
      const saved=await request(figure?`/figures/${figure.id}`:"/figures",{method:figure?"PUT":"POST",body});
      Alert.alert("Berhasil", "Data figur tersimpan.", [{text:"OK",onPress:()=>navigation.navigate("Figure Detail",{figure:saved})}]);
    } catch(e) { Alert.alert("Tidak berhasil",e.message); }
  };
  return <Screen><HeaderIntro title={figure?"Edit figur":"Tambah figur"} subtitle="Kelola data katalog Hirono." />
    <Field label="Nama figur *" value={name} onChangeText={setName} placeholder="Nama figur" />
    <Text style={styles.label}>Pilih seri *</Text>
    <View style={styles.chipWrap}>{seriesList.map(s=><Pressable key={s.id} onPress={()=>setSeriesId(String(s.id))} style={[styles.chip,seriesId===String(s.id)&&styles.chipActive]}><Text style={seriesId===String(s.id)?styles.chipTextActive:styles.chipText}>{s.name}</Text></Pressable>)}</View>
    <Field label="Kategori / rarity" value={rarity} onChangeText={setRarity} placeholder="Regular / Secret / Special" />
    <Field label="Deskripsi" value={description} onChangeText={setDescription} placeholder="Deskripsi singkat" multiline />
    <Text style={styles.label}>Gambar (opsional)</Text>
    {(localUri || imageUrl) ? <Image source={{ uri: localUri || imgSrc(imageUrl) }} style={styles.previewImg} /> : null}
    <Button title={(localUri || imageUrl) ? "Ganti gambar" : "Pilih gambar dari galeri"} secondary onPress={pickImage} />
    <Button title="Simpan data" onPress={save} />
  </Screen>;
}
function CollectionScreen({ navigation }) {
  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);
  const load=()=>request("/collection").then(setItems).catch(e=>Alert.alert("Gagal memuat koleksi",e.message)).finally(()=>setLoading(false));
  useEffect(()=>{const unsubscribe=navigation.addListener("focus",load);return unsubscribe;},[navigation]);
  const updateQuantity=async(item,quantity)=>{
    try { await request(`/collection/${item.id}`,{method:"PUT",body:JSON.stringify({quantity:Math.max(1,quantity)})});load(); }
    catch(e){Alert.alert("Gagal",e.message);}
  };
  const remove=async(item)=>{
    try{await request(`/collection/${item.id}`,{method:"DELETE"});load();}
    catch(e){Alert.alert("Gagal",e.message);}
  };
  return <Screen><HeaderIntro title="Koleksi saya" subtitle={`${items.length} jenis figur tersimpan di arsip pribadimu.`} />
    {loading?<ActivityIndicator color={Theme.accent}/>:items.length===0?<View style={styles.empty}><Text style={styles.emptyTitle}>Koleksimu masih kosong</Text><Text style={styles.muted}>Jelajahi katalog dan simpan figur yang kamu miliki.</Text><Button title="Kembali ke katalog" onPress={()=>navigation.navigate("Home")}/></View>:items.map(item=><View key={item.id} style={styles.collectionCard}><FigureRow item={item.figure} onPress={()=>navigation.navigate("Figure Detail",{figure:item.figure})}/><Text style={styles.muted}>Jumlah: {item.quantity} · Kondisi: {item.condition}</Text><View style={styles.actionRow}><Button title="−" secondary onPress={()=>updateQuantity(item,item.quantity-1)}/><Button title="+" onPress={()=>updateQuantity(item,item.quantity+1)}/><Button title="Hapus" secondary onPress={()=>remove(item)}/></View></View>)}
  </Screen>;
}
function AppShell() {
  return <ApiContext.Provider value={{}}><NavigationContainer>
    <StatusBar barStyle="dark-content" backgroundColor={Theme.bg}/>
    <Stack.Navigator screenOptions={{headerStyle:{backgroundColor:Theme.bg},headerTintColor:Theme.ink,headerTitleStyle:{fontWeight:"700"},contentStyle:{backgroundColor:Theme.bg}}}>
      <Stack.Screen name="Home" component={HomeScreen} options={{title:"Hirono Archive"}} />
      <Stack.Screen name="Series" component={SeriesScreen} options={{title:"Detail Seri"}} />
      <Stack.Screen name="Figure Detail" component={FigureDetailScreen} options={{title:"Detail Figur"}} />
      <Stack.Screen name="Manage Figure" component={ManageFigureScreen} options={{title:"Kelola Figur"}} />
      <Stack.Screen name="My Collection" component={CollectionScreen} options={{title:"Koleksi Saya"}} />
    </Stack.Navigator>
  </NavigationContainer></ApiContext.Provider>;
}
export default function App(){return <AppShell/>}

const styles=StyleSheet.create({
  screen:{flex:1,backgroundColor:Theme.bg},content:{padding:18,paddingBottom:36},
  hero:{backgroundColor:"#302A27",borderRadius:24,padding:24,marginBottom:28},
  heroEyebrow:{color:"#D8B9A4",fontSize:10,fontWeight:"800",letterSpacing:2},
  heroTitle:{color:"#FFF8F1",fontSize:34,fontWeight:"800",lineHeight:40,marginTop:14},
  heroText:{color:"#E2D6CE",fontSize:14,lineHeight:21,marginTop:10,marginBottom:18},
  kicker:{color:Theme.accent,fontSize:11,fontWeight:"800",letterSpacing:2,marginBottom:8},
  intro:{marginTop:8,marginBottom:14},pageTitle:{fontSize:27,fontWeight:"800",color:Theme.ink,letterSpacing:-.5},
  subtitle:{fontSize:14,color:Theme.muted,lineHeight:21,marginTop:6},
  seriesCard:{backgroundColor:Theme.card,borderColor:Theme.border,borderWidth:1,borderRadius:18,padding:16,width:190,marginRight:10,marginBottom:22,minHeight:126,justifyContent:"center"},
  seriesYear:{fontSize:12,color:Theme.accent,fontWeight:"800"},seriesName:{fontSize:18,fontWeight:"800",color:Theme.ink,marginTop:7,marginBottom:8},
  muted:{fontSize:12,color:Theme.muted,lineHeight:18},figureRow:{backgroundColor:Theme.card,borderColor:Theme.border,borderWidth:1,borderRadius:16,padding:12,marginBottom:10,flexDirection:"row",alignItems:"center",gap:12},
  figureThumb:{width:52,height:58,borderRadius:12,backgroundColor:"#E8DCD0",alignItems:"center",justifyContent:"center"},
  thumbText:{fontSize:28,fontWeight:"900",color:Theme.accent},figureName:{fontSize:15,fontWeight:"800",color:Theme.ink,marginBottom:4},
  tag:{alignSelf:"flex-start",fontSize:10,color:Theme.accent,backgroundColor:"#EFE3D8",overflow:"hidden",borderRadius:7,paddingHorizontal:8,paddingVertical:4,marginTop:7},
  button:{backgroundColor:Theme.accent,paddingVertical:12,paddingHorizontal:16,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:10},
  buttonSecondary:{backgroundColor:"#EDE4DC"},buttonText:{color:"#FFFFFF",fontWeight:"800",fontSize:13},buttonTextSecondary:{color:Theme.ink},
  field:{marginTop:12,marginBottom:4},label:{fontSize:12,fontWeight:"800",color:Theme.ink,marginBottom:6},
  input:{backgroundColor:Theme.card,borderColor:Theme.border,borderWidth:1,borderRadius:12,paddingHorizontal:13,paddingVertical:12,color:Theme.ink,fontSize:14},
  detailArt:{height:210,borderRadius:22,backgroundColor:"#E8DCD0",alignItems:"center",justifyContent:"center",marginBottom:24},
  detailLetter:{fontSize:92,fontWeight:"900",color:"#9D715B"},bodyText:{fontSize:15,lineHeight:23,color:Theme.ink,marginTop:14,marginBottom:16},
  chipWrap:{flexDirection:"row",flexWrap:"wrap",gap:7,marginVertical:10},chip:{borderRadius:18,borderWidth:1,borderColor:Theme.border,paddingHorizontal:10,paddingVertical:8,backgroundColor:Theme.card},chipActive:{backgroundColor:Theme.accent,borderColor:Theme.accent},chipText:{fontSize:11,color:Theme.ink},chipTextActive:{fontSize:11,color:"#FFFFFF",fontWeight:"800"},
  empty:{backgroundColor:Theme.card,borderRadius:18,padding:20,alignItems:"center",marginTop:16},emptyTitle:{fontSize:18,fontWeight:"800",color:Theme.ink,marginBottom:8},
  collectionCard:{backgroundColor:Theme.card,borderColor:Theme.border,borderWidth:1,borderRadius:16,padding:12,marginBottom:12},
  actionRow:{flexDirection:"row",gap:8,justifyContent:"space-between"},footnote:{fontSize:11,lineHeight:17,color:Theme.muted,marginTop:18},
  figureImg:{width:52,height:58,borderRadius:12},
  detailImg:{width:"100%",height:210,borderRadius:22,marginBottom:24},
  previewImg:{width:"100%",height:180,borderRadius:14,marginBottom:6}
});
