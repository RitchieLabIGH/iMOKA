/*
 * Kmer.h
 *
 *  Created on: Sep 16, 2019
 *      Author: claudio
 */

#ifndef MATRIX_KMER_H_
#define MATRIX_KMER_H_

#include "../Utils/IOTools.hpp"

namespace imoka {
namespace matrix {

/*
 *
 */
class Kmer {
public:

	Kmer(uint32_t k_len) :
			k_len(k_len), kmer(std::ceil((double) (2 * k_len) / 8)) {
	}
	Kmer(uint32_t k_len, uint64_t kmer_int) :
			Kmer(k_len) {
		from_int(kmer_int);
	}
	;

	Kmer(const Kmer & prefix, const Kmer & suffix) {
		k_len = prefix.k_len + suffix.k_len;
		kmer.resize(std::ceil((double) (2 * k_len) / 8), 0);
		unsigned char mask, suff_mask = 1;
		int n = 0, c, s = 0;
		for (c = 0; c < kmer.size(); c++) {
			if (n < prefix.k_len * 2) {
				kmer[c] = prefix.kmer[c];
			} else {
				kmer[c] = 0;
			}
			for (mask = 1; mask > 0 && n < k_len * 2; mask <<= 1, n++) {
				if (n >= prefix.k_len * 2) {
					if (suffix.kmer[s] & suff_mask) {
						kmer[c] |= mask;
					}
					suff_mask <<= 1;
					if (suff_mask <= 0) {
						suff_mask = 1;
						s++;
					}
				}
			}
		};
	}
	;
	Kmer(const Kmer & original, uint32_t length) :
			k_len(length), kmer(std::ceil((double) (2 * k_len) / 8)) {
		unsigned char mask;
		int n = 0, c, p = 0, s = 0;
		for (c = 0; c < kmer.size(); c++) {
			kmer[c] = 0;
			for (mask = 1; mask > 0 && n < k_len; n++, mask <<= 1) {
				if (original.kmer[c] & mask) {
					kmer[c] |= mask;
				}
			}
		};
	}
	Kmer() {
	}
	;
	Kmer(const std::string & str_kmer) :
			Kmer(str_kmer.size()) {
		from_str(str_kmer);
	}
	;
	virtual ~Kmer() {
	}
	;

	std::vector<unsigned char> kmer;
	uint32_t k_len = 31;

	bool operator <(const Kmer & second) const {
		unsigned char mask;
		int n = 0, c;
		for (c = 0; c < kmer.size(); c++) {
			for (mask = 1; mask > 0 && n < k_len * 2; n++, mask <<= 1)
				if ((kmer[c] & mask) ^ (second.kmer[c] & mask)) {
					return (second.kmer[c] & mask);
				}
		};
		return false;
	}
	bool operator ==(const Kmer & second) const {
		return kmer == second.kmer;
	}

	bool operator <=(const Kmer & second) const {
		if (this->kmer == second.kmer) {
			return true;
		}
		unsigned char mask;
		int n = 0, c;
		for (c = 0; c < kmer.size(); c++) {
			for (mask = 1; mask > 0 && n < k_len * 2; n++, mask <<= 1)
				if ((kmer[c] & mask) ^ (second.kmer[c] & mask)) {
					return (second.kmer[c] & mask);
				}
		};
		return false;
	}
	bool operator >(const Kmer & second) const {
		unsigned char mask;
		int n = 0, c;
		for (c = 0; c < kmer.size(); c++) {
			for (mask = 1; mask > 0 && n < k_len * 2; n++, mask <<= 1)
				if ((kmer[c] & mask) ^ (second.kmer[c] & mask)) {
					return (kmer[c] & mask);
				}
		};
		return false;
	}
	bool operator >=(const Kmer & second) const {
		if (kmer == second.kmer) {
			return true;
		}
		unsigned char mask;
		int n = 0, c;
		for (c = 0; c < kmer.size(); c++) {
			for (mask = 1; mask > 0 && n < k_len * 2; n++, mask <<= 1)
				if ((kmer[c] & mask) ^ (second.kmer[c] & mask)) {
					return (kmer[c] & mask);
				}
		};
		return true;
	}

	std::string str() const {
		unsigned char mask;
		int n = 0;
		std::string out;
		out.resize(k_len);
		for (int c = 0; c < kmer.size(); c++) {
			for (mask = 1; mask > 0 && n < k_len; n++, mask <<= 1) {
				if (kmer[c] & mask) {
					mask <<= 1;
					if (kmer[c] & mask) {
						out[n] = 'T';
					} else {
						out[n] = 'G';
					}
				} else {
					mask <<= 1;
					if (kmer[c] & mask) {
						out[n] = 'C';
					} else {
						out[n] = 'A';
					}
				}
			}
		};
		return out;
	}

	friend std::ostream& operator<<(std::ostream& stream, const Kmer & k) {
		stream << k.str();
		return stream;
	}
	friend std::istream& operator>>(std::istream& is, Kmer & k) {
		is.read((char*) k.kmer.data(), k.kmer.size());
		return is;
	}
	/// TODO: There is something wrong with the conversion
	uint64_t to_int() {
		unsigned char mask;
		int n = 0;
		uint64_t out = 0, toadd;
		for (int c = 0; c < kmer.size(); c++) {
			for (mask = 1; mask > 0 && n < k_len; ++n, mask <<= 1) {
				if (kmer[c] & mask) {
					mask <<= 1;
					if (kmer[c] & mask) {
						toadd = 3 * std::pow(4, (k_len - n - 1));
						out = out + toadd;
					} else {
						toadd = 2 * std::pow(4, (k_len - n - 1));
						out = out + toadd;
					}
				} else {
					mask <<= 1;
					if (kmer[c] & mask) {
						toadd = std::pow(4, (k_len - n - 1));
						out = out + toadd;
					}
				}
			}
		};
		return out;
	}

	void from_str(std::string str_kmer) {
		unsigned char mask;
		int n = 0, c, s = 0;
		for (c = 0; c < kmer.size(); c++) {
			kmer[c] = 0;
			for (mask = 1; mask > 0 && n < (k_len * 2); n++, mask <<= 1) {
				if (n % 2 == 1) {
					if (str_kmer[s] == 'C' || str_kmer[s] == 'T') {
						kmer[c] |= mask;
					}
					s++;
				} else {
					if (str_kmer[s] == 'G' || str_kmer[s] == 'T') {
						kmer[c] |= mask;
					}
				}
			}
		};
	}

	void from_int(uint64_t ikmer) {
		// TODO: this is a lazy way, it would be better to implement it directly to char with masks
		std::string result = "";
		int64_t k = k_len - 1;
		std::vector<std::string> letters { "A", "C", "G", "T" };
		while (k >= 0) {
			uint64_t kmin = pow(4, k);
			if (kmin <= ikmer) {
				uint64_t alpha = 3;
				bool statealpha = true;
				while (statealpha) {
					if (ikmer >= (alpha * kmin)) {
						ikmer -= (alpha * kmin);
						statealpha = false;
						result += letters[alpha];
					} else {
						alpha -= 1;
					}
				}
			} else {
				result += letters[0];
			}
			k--;
		}
		from_str(result);
	}

	static std::set<Kmer> generateKmers(std::string & source, uint8_t k_len) {
		std::set<Kmer> out;
		if (source.size() >= k_len) {
			for (int i = 0; i <= source.size() - k_len; i++) {
				out.insert(Kmer(source.substr(i, k_len)));
			}
		}
		return out;
	}
private:

};

class Prefix: public Kmer {
public:
	Prefix() {
	}
	;
	Prefix(uint32_t k) :
			Kmer(k) {
	}
	;
	Prefix(uint32_t k, uint64_t from) :
			Kmer(k), first_suffix(from) {
	}
	;
	Prefix(const Kmer & k, uint8_t prefix_size) :
			Kmer(prefix_size) {
		unsigned char mask;
		int n = 0, c;
		for (c = 0; c < kmer.size(); c++) {
			kmer[c] = 0;
			for (mask = 1; mask > 0 && n < k_len * 2; n++, mask <<= 1)
				if (k.kmer[c] & mask) {
					kmer[c] |= mask;
				}
		};

	}
	Prefix(const std::string & s) :
			Kmer(s) {
	}
	;
	virtual ~Prefix() {
	}
	;
	uint64_t first_suffix = 0;
private:

};
class Suffix: public Kmer {
public:
	Suffix() {
	}
	;
	Suffix(const std::string & s) :
			Kmer(s) {
	}
	;
	Suffix(uint32_t k) :
			Kmer(k) {
	}
	;
	Suffix(uint32_t k, uint32_t count) :
			Kmer(k), count(count) {
	}
	;
	Suffix(const Kmer & k, uint8_t suffix_size) :
			Kmer(suffix_size) {
		unsigned char mask, suff_mask = 1;
		int n = 0, c, s = 0, prefix_size = k.k_len - suffix_size;
		for (c = 0; c < k.kmer.size(); c++) {
			for (mask = 1; mask > 0 && n < k.k_len * 2; mask <<= 1, n++) {
				if (n >= prefix_size * 2) {
					if (k.kmer[c] & mask) {
						kmer[s] |= suff_mask;
					}
					suff_mask <<= 1;
					if (suff_mask <= 0) {
						suff_mask = 1;
						s++;
					}
				}
			}
		};

	}
	virtual ~Suffix() {
	}
	;
	uint32_t count = 0;
private:

};

template <class T>
class KmerMatrixLine {
public:
	Kmer & getKmer() { return kmer; }
	std::string getName(){return kmer.str();};
	std::vector<T> count;
	uint64_t index=0;
	void setKmer(const Kmer & new_kmer){
		kmer = new_kmer;
	}
	void setKmer(const std::string & new_kmer){
		Kmer k(new_kmer);
		kmer = k;
	}
private:
	Kmer kmer;
};


}

}

#endif /* MATRIX_KMER_H_ */
