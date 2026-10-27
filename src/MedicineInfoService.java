import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.*;

public class MedicineInfoService {
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public MedicineInfo lookup(String medicineName) throws Exception {
        String q = medicineName.trim();
        String search = "(openfda.brand_name:\""+q+"\" OR openfda.generic_name:\""+q+"\" OR openfda.substance_name:\""+q+"\")";
        String url = "https://api.fda.gov/drug/label.json?search=" + URLEncoder.encode(search, StandardCharsets.UTF_8) + "&limit=1";
        HttpRequest req = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(20))
                .header("Accept","application/json").GET().build();
        HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
        if(res.statusCode()==404) return null;
        if(res.statusCode()!=200) throw new RuntimeException("Medicine service returned HTTP "+res.statusCode());
        String json=res.body();
        String brand=firstArrayValue(json,"brand_name");
        String generic=firstArrayValue(json,"generic_name");
        StringBuilder searchable=new StringBuilder();
        StringBuilder evidence=new StringBuilder();
        addField(json,"active_ingredient","Active ingredient",searchable,evidence);
        addField(json,"inactive_ingredient","Inactive ingredient",searchable,evidence);
        addField(json,"contraindications","Contraindications",searchable,evidence);
        addField(json,"warnings","Warnings",searchable,evidence);
        addField(json,"warnings_and_cautions","Warnings and cautions",searchable,evidence);
        addField(json,"spl_product_data_elements","Product data",searchable,evidence);
        if(brand!=null) searchable.append(' ').append(brand);
        if(generic!=null) searchable.append(' ').append(generic);
        return new MedicineInfo(q, blank(brand,"Not available"), blank(generic,"Not available"), searchable.toString(), evidence.toString());
    }
    private void addField(String json,String field,String label,StringBuilder search,StringBuilder evidence){
        String value=firstArrayValue(json,field);
        if(value!=null && !value.isBlank()){
            search.append(' ').append(value);
            if(evidence.length()<5000) evidence.append(label).append(": ").append(value).append("\n\n");
        }
    }
    private String firstArrayValue(String json,String field){
        Pattern p=Pattern.compile("\\\""+Pattern.quote(field)+"\\\"\\s*:\\s*\\[\\s*\\\"((?:\\\\.|[^\\\"\\\\])*)\\\"",Pattern.DOTALL);
        Matcher m=p.matcher(json); return m.find()?unescape(m.group(1)):null;
    }
    private String unescape(String s){
        return s.replace("\\n"," ").replace("\\r"," ").replace("\\t"," ").replace("\\\"","\"").replace("\\/","/").replace("\\\\","\\");
    }
    private String blank(String s,String fallback){return s==null||s.isBlank()?fallback:s;}
}
