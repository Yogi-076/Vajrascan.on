import time

class PipelineState:
    def __init__(self):
        self.target = ""
        self.domain = ""
        self.out_dir = ""
        
        # Recon / Spidering
        self.all_urls = []            
        self.param_urls = []          
        self.ws_urls = []             
        self.lfi_urls = []            
        self.fuzz_urls = []           
        self.params = []              
        
        # Findings
        self.nuclei_hits = []         
        self.cors_hits = []           
        self.ws_hits = []             
        self.header_hits = []         
        self.header_injectable_urls = []  
        self.redirect_hits = []       
        self.xss_hits = []            
        self.cmdi_hits = []           
        self.lfi_hits = []            
        self.idor_hits = []           
        self.race_hits = []           
        
        # Audit
        self.results = []             
        self.start_time = time.time()
