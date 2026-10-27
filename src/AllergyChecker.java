import java.util.*;
import java.util.regex.*;

public class AllergyChecker {
    public AllergyCheckResult check(String storedAllergies, MedicineInfo info){
        if(info==null || info.getSearchableText()==null || info.getSearchableText().isBlank())
            return new AllergyCheckResult(AllergyCheckResult.Status.INSUFFICIENT_INFORMATION,List.of(),"","No usable medicine label information was found.");
        List<String> allergies=parseAllergies(storedAllergies);
        if(allergies.isEmpty())
            return new AllergyCheckResult(AllergyCheckResult.Status.NO_IDENTIFIED_CONFLICT,List.of(),"","No allergies are recorded in this patient's profile.");
        String hay=normalize(info.getSearchableText());
        List<String> matched=new ArrayList<>();
        for(String original:allergies){
            String a=normalizeAllergy(original);
            if(a.isBlank()) continue;
            if(containsTerm(hay,a)) matched.add(original.trim());
        }
        if(!matched.isEmpty()){
            String ev=findEvidence(info.getEvidenceText(),matched);
            return new AllergyCheckResult(AllergyCheckResult.Status.POTENTIAL_CONFLICT,matched,ev,"A recorded allergy term was found in available ingredient/warning/contraindication information for this medicine label.");
        }
        return new AllergyCheckResult(AllergyCheckResult.Status.NO_IDENTIFIED_CONFLICT,List.of(),"","No recorded allergy term was identified in the available medicine label information. This does not prove the product is safe.");
    }
    private List<String> parseAllergies(String s){
        List<String> out=new ArrayList<>(); if(s==null)return out;
        for(String x:s.split("[,;\\n]")) if(!x.trim().isEmpty()) out.add(x.trim()); return out;
    }
    private String normalizeAllergy(String s){
        String x=normalize(s); x=x.replaceAll("\\b(allergy|allergies|allergic|hypersensitivity|to)\\b"," "); return x.replaceAll("\\s+"," ").trim();
    }
    private String normalize(String s){return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+"," ").replaceAll("\\s+"," ").trim();}
    private boolean containsTerm(String hay,String term){
        if(term.length()<3)return false;
        return (" "+hay+" ").contains(" "+term+" ");
    }
    private String findEvidence(String evidence,List<String> matches){
        if(evidence==null||evidence.isBlank()) return "Relevant term found in medicine label information.";
        String lower=evidence.toLowerCase(Locale.ROOT);
        for(String m:matches){
            String term=normalizeAllergy(m); int i=lower.indexOf(term.toLowerCase(Locale.ROOT));
            if(i>=0){int start=Math.max(0,i-180),end=Math.min(evidence.length(),i+term.length()+260);return evidence.substring(start,end).replaceAll("\\s+"," ").trim();}
        }
        return evidence.length()>500?evidence.substring(0,500)+"...":evidence;
    }
}
