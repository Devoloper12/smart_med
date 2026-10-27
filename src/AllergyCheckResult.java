import java.util.*;
public class AllergyCheckResult {
    public enum Status { POTENTIAL_CONFLICT, NO_IDENTIFIED_CONFLICT, INSUFFICIENT_INFORMATION }
    private final Status status;
    private final List<String> matchedAllergies;
    private final String evidence;
    private final String details;
    public AllergyCheckResult(Status status, List<String> matchedAllergies, String evidence, String details){
        this.status=status; this.matchedAllergies=matchedAllergies; this.evidence=evidence; this.details=details;
    }
    public Status getStatus(){return status;}
    public List<String> getMatchedAllergies(){return matchedAllergies;}
    public String getEvidence(){return evidence;}
    public String getDetails(){return details;}
}
