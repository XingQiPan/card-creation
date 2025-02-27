export namespace main {
	
	export class Updater {
	
	
	    static createFrom(source: any = {}) {
	        return new Updater(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class VersionInfo {
	    frontendVersion: string;
	    backendVersion: string;
	    latestFrontend: string;
	    latestBackend: string;
	    needUpdate: boolean;
	
	    static createFrom(source: any = {}) {
	        return new VersionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.frontendVersion = source["frontendVersion"];
	        this.backendVersion = source["backendVersion"];
	        this.latestFrontend = source["latestFrontend"];
	        this.latestBackend = source["latestBackend"];
	        this.needUpdate = source["needUpdate"];
	    }
	}

}

