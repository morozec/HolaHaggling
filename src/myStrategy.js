'use strict'; /*jslint node:true*/

module.exports = class Agent {
    constructor(me, counts, values, max_rounds, log){
		this.counts = counts;
		
		this.values = values;
		this.max_rounds = max_rounds
        this.rounds = max_rounds;
        this.log = log;
        this.total = 0;
        for (let i = 0; i<counts.length; i++)
            this.total += counts[i]*values[i];
		
		this.isFirstPlayer = false;
		this.enemyZeroIndexes = []; 	
				

		this.possibleOffers = this.getPossibleOffersRec(0);	
		this.possibleOffers = this.getNotZeroValuesOffers();
		this.possibleOffers = this.getNotMaxCountOffers();
		this.possibleOffers.sort(comparator(this.values));
		//for (var i in this.possibleOffers)
		//	this.log(this.possibleOffers[i]);		

		this.prevOfferIndex = -1;
		this.possibleEnemyValues = null;
		this.previousEnemyOffer = null;
	}

	getNotZeroValuesOffers(){
		var res = [];
		for (var i in this.possibleOffers){
			var po = this.possibleOffers[i];
			var hasZeroValue = false;
			for (var j = 0; j < po.length; ++j){
				if (this.values[j] > 0) continue;
				if (po[j] > 0){
					hasZeroValue = true;
					break
				}
			}
			if (!hasZeroValue) res.push(po);
		}
		return res;
	}

	getNotMaxCountOffers(){
		var res = [];
		var maxCount = this.getMaxCount();
		for (var i in this.possibleOffers){
			var po = this.possibleOffers[i];
			var count = this.getOfferCount(po);
			if (count < maxCount) res.push(po);
		}
		return res;
	}

	getEnemyZeroIndexesOffers(){
		var res = [];
		for (var i in this.possibleOffers){
			var po = this.possibleOffers[i];

			var needRemove = false;
			for (var j = 0; j < po.length; ++j){
				if (this.enemyZeroIndexes.includes(j) && po[j] < this.counts[j] && this.values[j] > 0){
					needRemove = true;
					break;
				}
			}

			if (!needRemove){
				res.push(po)
			}
			else if (i == 0){ //0 offer is removed. need to shift index
				this.prevOfferIndex = -1;
			}
		}
		return res;
	}
	
    offer(o){
		this.log(`${this.rounds} rounds left`);	
				
        if (o)
        {
			var enemyOffer = this.getEnemyOffer(o);
			if (this.possibleEnemyValues == null){
				this.possibleEnemyValues = this.getPossibleEnemyValues(enemyOffer);				
			}
			else{
				this.possibleEnemyValues = this.updatePossibleEnemyValues(enemyOffer);
			}
			this.previousEnemyOffer = enemyOffer;

			for (var i in this.possibleEnemyValues)
					this.log(this.possibleEnemyValues[i]);

			var suggestedSumValue = this.getOfferSumValue(o);			
			this.log(`suggested sum value: ${suggestedSumValue}`);

			if (this.prevOfferIndex >= 0 && suggestedSumValue >= this.getOfferSumValue(this.possibleOffers[this.prevOfferIndex]))
				return;
			
			if (this.rounds == this.max_rounds || 
				this.isFirstPlayer && this.rounds == this.max_rounds - 1)
			{
				for (let i = 0; i<o.length; i++){
					if (o[i] == this.counts[i]){
						//enemy don't need this item. Probably is has zero value for him
						this.enemyZeroIndexes.push(i);
					}
				}
				this.possibleOffers = this.getEnemyZeroIndexesOffers();
				//for (var i in this.possibleOffers)
				//	this.log(this.possibleOffers[i]);
			}
			

			if (!this.isFirstPlayer && this.rounds == 1) 
			{
				let sum = 0;
				for (let i = 0; i<o.length; i++)
					sum += this.values[i]*o[i];
				if (sum>0)
					return;
			}
        }
		else
		{			
			this.isFirstPlayer = true;
		}
		
		

		var currOfferIndex = 
			this.prevOfferIndex < this.possibleOffers.length - 1 ? 
				this.prevOfferIndex + 1 : 
				this.prevOfferIndex;
		
		var currOffer = this.possibleOffers[currOfferIndex];
		
		//if current offer if zero value for me or too cheap, suggest preveous one		
		var isBadOffer = this.isZeroOffer(currOffer) || this.isPoorOffer(currOffer);
		
		if (isBadOffer){
			currOfferIndex = this.prevOfferIndex;
			currOffer = this.possibleOffers[currOfferIndex];
		}
		

		var mySumValue = this.getOfferSumValue(currOffer);		
		this.log(`my sum value: ${mySumValue}`);		
			
		this.rounds--;
		this.prevOfferIndex = currOfferIndex;
		
		if (suggestedSumValue && mySumValue <= suggestedSumValue)
			return;

        return currOffer;
	}
	

	isZeroOffer(o){
		for (var i = 0; i < o.length; ++i)		
			if (o[i] > 0)			
				return false;		
		
		return true;
	}

	isPoorOffer(o){
		var sumValue = this.getOfferSumValue(o);
		return sumValue < this.getMaxSumValue() / 2;
	}

	getMaxSumValue(){
		var sum = 0;
		for (var i = 0; i < this.counts.length; ++i)
			sum += this.counts[i] * this.values[i];
		return sum;
	}

	
		

	getPossibleOffersRec(index){
		var count = this.counts[index];
		var currRes = []
		for (var i = 0; i <= count; ++i){
			currRes.push([i]);
		}

		if (index == this.counts.length - 1)		
			return currRes;
		
		var nextRes = this.getPossibleOffersRec(index + 1);
		var res = [];
		for (var i = 0; i < currRes.length; ++i){				
			for (var arrI in nextRes){				
				res.push(currRes[i].concat(nextRes[arrI]));			
			}			
		}
		return res;
	}
	
	getOfferSumValueWithValues(o, values){
		return getOfferSumValue(o, values);
	}

	getOfferSumValue(o){		
		return getOfferSumValue(o, this.values);
	}

	getOfferCount(o){
		var count = 0;
		for (var i = 0; i < o.length; ++i)
			count += o[i];
		return count;
	}

	getMaxCount(){
		return this.getOfferCount(this.counts);
	}

	getEnemyOffer(offer){
		var enemyOffer = [];
		for (var i = 0; i < offer.length; ++i){
			enemyOffer.push(this.counts[i] - offer[i]);
		}	
		return enemyOffer;
	}

	getPossibleEnemyValues(enemyOffer){			
		var possibleEnemyValues = this.getPossibleEnemyValuesRec(enemyOffer, this.getMaxSumValue(), 0)
		return possibleEnemyValues;
	}

	getPossibleEnemyValuesRec(offer, currSumValue, index){	
		
		if (index == offer.length - 1){
			if (offer[index] == 0){				
				if (currSumValue == 0) return [0];
				else return null;
			}
			if (currSumValue == 0) return null;
			if (currSumValue % this.counts[index] != 0) return null;
			return [currSumValue / this.counts[index]];
		}

		var variants = []
		if (offer[index] == 0){			
			var nextVariants = this.getPossibleEnemyValuesRec(offer, currSumValue, index + 1)
			for (var i in nextVariants){
				var nextVariant = nextVariants[i];
				if (nextVariant != null)
					variants.push([0].concat(nextVariant))
			}
		}
		else{

			var i = 1;
			while (currSumValue - i * this.counts[index] >= 0){			
				var nextVariants = this.getPossibleEnemyValuesRec(offer, currSumValue - i * this.counts[index], index + 1)
				for (var j in nextVariants){
					var nextVariant = nextVariants[j];					
					if (nextVariant != null){
						
						variants.push([i].concat(nextVariant))
					}
				}
				i++;
			}
		}
		
		return variants;
	}

	updatePossibleEnemyValues(enemyOffer){		
		var reducedIndexes = [];

		var isRedused = {};
		for (var i = 0; i < enemyOffer.length; ++i){
			var delta = enemyOffer[i] - this.previousEnemyOffer[i];
			isRedused[i] = delta < 0;			
		}

		var res = [];
		var maxReduced = 0;
		var minNotReduced = Number.MAX_SAFE_INTEGER;
		for (var i = 0; i < this.possibleEnemyValues.length; ++i){
			var pev = this.possibleEnemyValues[i];
			for (var j = 0; j < pev.length; ++j){
				if (isRedused[j]){
					if (pev[j] > maxReduced){
						maxReduced = pev[j];
					}					
				}
				else{
					if (pev[j] != 0 && pev[j] < minNotReduced){
						minNotReduced = pev[j];
					}
				}
			}
			if (maxReduced < minNotReduced){
				res.push(pev);
			}
		}
		return res;
	}

	
};

function getOfferSumValue(o, values){
	var sumValue = 0;
	for (var i = 0; i < o.length; ++i){
		sumValue += o[i] * values[i];
	}
	return sumValue;
}

function comparator(values){
	return function(offerA, offerB){
		return -getOfferSumValue(offerA, values) + getOfferSumValue(offerB, values)
	}
}



