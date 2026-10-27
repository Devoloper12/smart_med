import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

public class MainView extends JFrame implements CaregiverObserver {
    private final Controller controller = new Controller();
    private final MasterUnitController masterUnit = new MasterUnitController("MASTER-01");
    private User currentUser;
    private final JTextField txtMedName = new JTextField();
    private final JTextField txtDosage = new JTextField();
    private final JTextField txtTiming = new JTextField();
    private final JComboBox<String> comboMeal = new JComboBox<>(new String[]{"Before Meal", "After Meal", "With Food"});
    private final DefaultTableModel tableModel = new DefaultTableModel(new String[]{"ID","Medicine","Dosage","Timing","Meal Note","Status"},0){public boolean isCellEditable(int r,int c){return false;}};
    private final JTable table = new JTable(tableModel);
    private final JTextArea txtAlertLog = new JTextArea(6,80);
    private JLabel lblWelcome;
    private JLabel lblAllergies;

    public MainView() {
        currentUser = Session.getCurrentUser();
        if (currentUser == null) { SwingUtilities.invokeLater(() -> new LoginView().setVisible(true)); dispose(); return; }
        masterUnit.addSlaveUnit(new SlaveUnit("SLAVE-BEDROOM")); masterUnit.registerObserver(this);
        setTitle("Smart Medicine Reminder & Health Assistant"); setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1180,760); setMinimumSize(new Dimension(1000,650)); setLocationRelativeTo(null);
        setContentPane(buildUI()); refreshUser(); refreshTableData();
    }

    private JPanel buildUI(){
        JPanel root=new JPanel(new BorderLayout()); root.setBackground(new Color(243,248,249));
        root.add(buildHeader(),BorderLayout.NORTH); root.add(buildSidebar(),BorderLayout.WEST); root.add(buildCenter(),BorderLayout.CENTER); return root;
    }

    private JPanel buildHeader(){
        JPanel p=new JPanel(new BorderLayout()); p.setBackground(Color.WHITE); p.setBorder(new EmptyBorder(10,20,10,20));
        JLabel brand=new JLabel(" Smart Medicine Assistant",LoginView.loadIcon("resources/images/medical_logo.png",52,52),SwingConstants.LEFT); brand.setFont(new Font("SansSerif",Font.BOLD,22)); brand.setForeground(new Color(18,102,108));
        lblWelcome=new JLabel(); lblWelcome.setFont(new Font("SansSerif",Font.BOLD,15)); lblWelcome.setForeground(new Color(60,70,75)); p.add(brand,BorderLayout.WEST);p.add(lblWelcome,BorderLayout.EAST);return p;
    }

    private JPanel buildSidebar(){
        JPanel side=new JPanel();side.setLayout(new BoxLayout(side,BoxLayout.Y_AXIS));side.setPreferredSize(new Dimension(220,0));side.setBackground(new Color(18,102,108));side.setBorder(new EmptyBorder(25,18,25,18));
        JLabel patient=new JLabel("PATIENT MENU");patient.setForeground(new Color(190,235,235));patient.setFont(new Font("SansSerif",Font.BOLD,12));patient.setAlignmentX(Component.LEFT_ALIGNMENT);side.add(patient);side.add(Box.createVerticalStrut(18));
        JButton profile=sideButton("Patient Profile"); JButton sync=sideButton("Master-Slave Sync"); JButton sos=sideButton("Emergency SOS"); JButton logout=sideButton("Logout");
        side.add(profile);side.add(Box.createVerticalStrut(10));side.add(sync);side.add(Box.createVerticalStrut(10));side.add(sos);side.add(Box.createVerticalGlue());side.add(logout);
        profile.addActionListener(e->showProfileDialog()); sync.addActionListener(e->syncUnits()); sos.addActionListener(e->triggerSOS()); logout.addActionListener(e->logout()); return side;
    }

    private JButton sideButton(String text){JButton b=new JButton(text);b.setAlignmentX(Component.LEFT_ALIGNMENT);b.setMaximumSize(new Dimension(Integer.MAX_VALUE,42));b.setBackground(new Color(28,124,130));b.setForeground(Color.WHITE);b.setFocusPainted(false);b.setBorderPainted(false);return b;}

    private JPanel buildCenter(){
        JPanel center=new JPanel(new BorderLayout(12,12));center.setOpaque(false);center.setBorder(new EmptyBorder(16,16,16,16));
        JPanel top=new JPanel(new BorderLayout(10,10));top.setOpaque(false);top.add(buildProfileCard(),BorderLayout.NORTH);top.add(buildPrescriptionCard(),BorderLayout.CENTER);center.add(top,BorderLayout.NORTH);
        table.setRowHeight(28);table.getTableHeader().setFont(new Font("SansSerif",Font.BOLD,13));JScrollPane sp=new JScrollPane(table);sp.setBorder(BorderFactory.createTitledBorder("My Medicine Schedule"));center.add(sp,BorderLayout.CENTER);
        JPanel bottom=new JPanel(new BorderLayout(8,8));bottom.setOpaque(false);JPanel actions=new JPanel(new FlowLayout(FlowLayout.LEFT));actions.setOpaque(false);
        JButton taken=LoginView.primaryButton("Mark as TAKEN");JButton missed=new JButton("Mark as MISSED");missed.setBackground(new Color(245,170,70));missed.setForeground(Color.WHITE);missed.setFocusPainted(false);actions.add(taken);actions.add(missed);
        txtAlertLog.setEditable(false);txtAlertLog.setLineWrap(true);txtAlertLog.setWrapStyleWord(true);txtAlertLog.setBackground(new Color(250,252,252));JScrollPane logs=new JScrollPane(txtAlertLog);logs.setBorder(BorderFactory.createTitledBorder("Caregiver & System Alert Terminal"));bottom.add(actions,BorderLayout.NORTH);bottom.add(logs,BorderLayout.CENTER);center.add(bottom,BorderLayout.SOUTH);
        taken.addActionListener(e->changeStatus("TAKEN"));missed.addActionListener(e->changeStatus("MISSED"));return center;
    }

    private JPanel buildProfileCard(){
        JPanel p=new JPanel(new BorderLayout());p.setBackground(new Color(229,247,247));p.setBorder(new EmptyBorder(12,16,12,16));
        JLabel title=new JLabel("Personal Allergy Guard");title.setFont(new Font("SansSerif",Font.BOLD,17));title.setForeground(new Color(18,102,108));lblAllergies=new JLabel();p.add(title,BorderLayout.WEST);p.add(lblAllergies,BorderLayout.CENTER);JButton edit=new JButton("Edit Profile");edit.addActionListener(e->showProfileDialog());p.add(edit,BorderLayout.EAST);return p;
    }

    private JPanel buildPrescriptionCard(){
        JPanel p=new JPanel(new GridBagLayout());p.setBackground(Color.WHITE);p.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createTitledBorder("Add Prescription & Stored-Allergy Check"),new EmptyBorder(6,8,6,8)));GridBagConstraints g=new GridBagConstraints();g.insets=new Insets(5,6,5,6);g.fill=GridBagConstraints.HORIZONTAL;g.weightx=1;
        addGrid(p,g,0,"Medicine Name",txtMedName);addGrid(p,g,1,"Dosage",txtDosage);addGrid(p,g,2,"Timing",txtTiming);g.gridx=0;g.gridy=3;g.weightx=0;p.add(new JLabel("Guidance / Meal"),g);g.gridx=1;g.weightx=1;p.add(comboMeal,g);JButton add=LoginView.primaryButton("ADD PRESCRIPTION");g.gridx=2;g.gridy=3;g.weightx=0;p.add(add,g);add.addActionListener(e->addPrescription());return p;
    }
    private void addGrid(JPanel p,GridBagConstraints g,int row,String label,JComponent c){g.gridx=0;g.gridy=row;g.weightx=0;p.add(new JLabel(label),g);g.gridx=1;g.gridwidth=2;g.weightx=1;p.add(c,g);g.gridwidth=1;}

    private void addPrescription(){
        String med=txtMedName.getText().trim(),dose=txtDosage.getText().trim(),time=txtTiming.getText().trim(),meal=(String)comboMeal.getSelectedItem();
        if(med.isEmpty()||dose.isEmpty()||time.isEmpty()){JOptionPane.showMessageDialog(this,"Please fill medicine name, dosage and timing.");return;}

        setCursor(Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR));
        try {
            MedicineInfo info = new MedicineInfoService().lookup(med);
            if(info==null){
                int r=JOptionPane.showConfirmDialog(this,
                        "INSUFFICIENT MEDICINE INFORMATION\n\nThe medicine could not be found in the available drug-label source.\n"+
                        "The app cannot screen it against your allergies.\n\nDo you still want to add it?",
                        "Allergy Guard",JOptionPane.YES_NO_OPTION,JOptionPane.WARNING_MESSAGE);
                if(r!=JOptionPane.YES_OPTION){txtAlertLog.append("[ALLERGY CHECK] Cancelled because medicine information was unavailable: "+med+".\n");return;}
            } else {
                AllergyCheckResult result = new AllergyChecker().check(currentUser.getAllergies(),info);
                if(result.getStatus()==AllergyCheckResult.Status.POTENTIAL_CONFLICT){
                    String matches=String.join(", ",result.getMatchedAllergies());
                    String evidence=result.getEvidence();
                    controller.logAllergyAlert(currentUser.getUserId(),med,matches,evidence);
                    String contact=currentUser.getCaregiverContact().isBlank()?"not configured":currentUser.getCaregiverContact();
                    txtAlertLog.append("[CAREGIVER ALLERGY ALERT] Medicine: "+med+" | Recorded allergy match: "+matches+" | Simulated alert to "+contact+".\n");
                    JTextArea area=new JTextArea(
                            "POTENTIAL ALLERGY CONFLICT\n\nPatient: "+currentUser.getName()+"\nMedicine: "+med+
                            "\nMatched recorded allergy/allergies: "+matches+"\n\nRelevant label evidence:\n"+evidence+
                            "\n\nThis is a screening warning based on available drug-label text. It does not prove an allergic reaction will occur.\nVerify the exact product with a doctor or pharmacist.\n\nAdd this prescription anyway?");
                    area.setEditable(false); area.setLineWrap(true); area.setWrapStyleWord(true); area.setRows(16); area.setColumns(60); area.setBackground(UIManager.getColor("Panel.background"));
                    int r=JOptionPane.showConfirmDialog(this,new JScrollPane(area),"Potential Allergy Conflict",JOptionPane.YES_NO_OPTION,JOptionPane.WARNING_MESSAGE);
                    if(r!=JOptionPane.YES_OPTION){txtAlertLog.append("[ALLERGY BLOCK] User cancelled "+med+" after potential conflict warning.\n");return;}
                } else if(result.getStatus()==AllergyCheckResult.Status.NO_IDENTIFIED_CONFLICT){
                    txtAlertLog.append("[ALLERGY CHECK] "+med+": no recorded allergy term identified in available label information. This is not a safety guarantee.\n");
                } else {
                    int r=JOptionPane.showConfirmDialog(this,
                            "INSUFFICIENT INFORMATION\n\nThe app could not obtain enough information to screen this medicine against the recorded allergies.\n\nDo you still want to add it?",
                            "Allergy Guard",JOptionPane.YES_NO_OPTION,JOptionPane.WARNING_MESSAGE);
                    if(r!=JOptionPane.YES_OPTION)return;
                }
            }
        } catch(Exception ex){
            ex.printStackTrace();
            int r=JOptionPane.showConfirmDialog(this,
                    "The online medicine-information check failed.\nCheck your internet connection or medicine spelling.\n\nThe allergy screen could not be completed. Add anyway?",
                    "Medicine Lookup Failed",JOptionPane.YES_NO_OPTION,JOptionPane.WARNING_MESSAGE);
            if(r!=JOptionPane.YES_OPTION)return;
        } finally { setCursor(Cursor.getDefaultCursor()); }

        if(controller.addPrescription(currentUser.getUserId(),med,dose,time,meal)){txtAlertLog.append("[SUCCESS] Added prescription: "+med+"\n");refreshTableData();txtMedName.setText("");txtDosage.setText("");txtTiming.setText("");}
    }

    private void changeStatus(String status){int row=table.getSelectedRow();if(row<0){JOptionPane.showMessageDialog(this,"Select a medicine first.");return;}int id=(int)tableModel.getValueAt(row,0);String med=(String)tableModel.getValueAt(row,1);controller.updatePrescriptionStatus(currentUser.getUserId(),id,status);refreshTableData();if("MISSED".equals(status))masterUnit.notifyMissedDose(med);else txtAlertLog.append("[ACKNOWLEDGED] "+med+" marked TAKEN.\n");}
    private void syncUnits(){List<Prescription> list=controller.getAllPrescriptions(currentUser.getUserId());masterUnit.syncSchedule(list);txtAlertLog.append("[SYNC] "+list.size()+" medicine schedule(s) synchronized with simulated units.\n");}
    private void triggerSOS(){String msg="SOS EMERGENCY BUTTON PRESSED by "+currentUser.getName()+"!";controller.logEmergencyEvent(currentUser.getUserId(),msg);masterUnit.notifyEmergency(msg);}

    private void showProfileDialog(){
        JTextField name=new JTextField(currentUser.getName(),22);JTextArea allergies=new JTextArea(currentUser.getAllergies(),4,22);allergies.setLineWrap(true);JTextField caregiver=new JTextField(currentUser.getCaregiverContact(),22);JPanel p=new JPanel(new GridLayout(0,1,4,4));p.add(new JLabel("Patient Name"));p.add(name);p.add(new JLabel("Allergies (comma separated)"));p.add(new JScrollPane(allergies));p.add(new JLabel("Caregiver Contact"));p.add(caregiver);
        int r=JOptionPane.showConfirmDialog(this,p,"Edit Patient Profile",JOptionPane.OK_CANCEL_OPTION,JOptionPane.PLAIN_MESSAGE);if(r==JOptionPane.OK_OPTION){if(name.getText().trim().isEmpty()){JOptionPane.showMessageDialog(this,"Patient name cannot be empty.");return;}if(controller.updateProfile(currentUser.getUserId(),name.getText(),allergies.getText(),caregiver.getText())){refreshUser();txtAlertLog.append("[PROFILE] Patient profile updated.\n");}}
    }

    private void refreshUser(){User updated=controller.getUser(currentUser.getUserId());if(updated!=null){currentUser=updated;Session.setCurrentUser(updated);}lblWelcome.setText("Welcome, "+currentUser.getName()+"   |   @"+currentUser.getUsername());String a=currentUser.getAllergies().isBlank()?"No allergies entered":currentUser.getAllergies();lblAllergies.setText("     Stored allergies: "+a);}
    private void refreshTableData(){tableModel.setRowCount(0);for(Prescription p:controller.getAllPrescriptions(currentUser.getUserId()))tableModel.addRow(new Object[]{p.getId(),p.getMedicineName(),p.getDosage(),p.getTiming(),p.getMealInstruction(),p.getStatus()});}
    private void logout(){Session.clear();new LoginView().setVisible(true);dispose();}

    @Override public void onEmergencyTriggered(String message){String contact=currentUser.getCaregiverContact().isBlank()?"not configured":currentUser.getCaregiverContact();txtAlertLog.append("[ALERT ESCALATION] "+message+" -> Simulated caregiver alert to "+contact+".\n");JOptionPane.showMessageDialog(this,message+"\nCaregiver alert simulated.","EMERGENCY BROADCAST",JOptionPane.ERROR_MESSAGE);}
    @Override public void onMissedDoseAlert(String medicineName){String contact=currentUser.getCaregiverContact().isBlank()?"not configured":currentUser.getCaregiverContact();txtAlertLog.append("[CAREGIVER ALERT] Missed dose: "+medicineName+". Simulated alert to "+contact+".\n");}

    public static void main(String[] args){DatabaseSetup.initializeDatabase();SwingUtilities.invokeLater(()->new LoginView().setVisible(true));}
}
