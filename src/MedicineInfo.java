public class MedicineInfo {
    private final String query;
    private final String brandName;
    private final String genericName;
    private final String searchableText;
    private final String evidenceText;

    public MedicineInfo(String query, String brandName, String genericName, String searchableText, String evidenceText) {
        this.query = query; this.brandName = brandName; this.genericName = genericName;
        this.searchableText = searchableText; this.evidenceText = evidenceText;
    }
    public String getQuery(){ return query; }
    public String getBrandName(){ return brandName; }
    public String getGenericName(){ return genericName; }
    public String getSearchableText(){ return searchableText; }
    public String getEvidenceText(){ return evidenceText; }
}
